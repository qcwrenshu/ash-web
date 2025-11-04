/*
Ash Web
@qcwrenshu

This file is the entire web server for Ash.

If transplanted into Ash Public, please require this file from /index.js after all modules have been loaded.
Ash Public does not include Ash Vehicles, so vehicles-related functions will error.

The application authenticates using Discord OAuth.
For testing, you can just force a session token using a Discord ID and, at the minimum, any username.
We don't like making requests to Discord, so:
    The service does not use the access token beyond initial identification, as details are cached to disk.
    The refresh token is not used at all.
    The application is set to only request the bare minimum amount of information from Discord.
    It is expected that the bot user can provide anything else we might need.
    Of course, that means that user of Ash Web Console must be in the (same) Discord server (as the bot user).
For production, set ASH_CLIENT_SECRET environment variable.

Head to /api/graphql in your browser to load the GraphiQL interface.

*/

const client = process.client;

const fs = require("node:fs");

const enmap = require("enmap");
const fuzzysort = require("fuzzysort");
const { request } = require("undici");
const { nanoid } = require("nanoid");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const express = require("express");

const { makeExecutableSchema } = require("@graphql-tools/schema");
const { graphqlHTTP } = require("express-graphql");

const app = express();

app.use(compression());
app.use(express.static("web/public", { maxAge: "1h" }));
app.use(require("body-parser").json());
app.use(require("cookie-parser")());

const sessions = new enmap({ name: "Web-Sessions", wal: true });
client.web = { app, sessions };

async function getJSONResponse(body) {
    let fullBody = "";
    for await (const data of body) fullBody += data.toString();
    return JSON.parse(fullBody);
}
async function getMember(user, force = false) {
    const guild = await client.guilds.fetch(""); // scrubbed
    try {
        return await guild.members.fetch({ user, force });
    } catch (error) {
        if (guild.available && error.message.includes("Unknown")) return null;
        return await guild.members.fetch({ user, force });
    }
}
/*async function getMember(user, force) {
    const guild = await client.guilds.fetch(""); // scrubbed
    force = force ?? false;
    return new Promise((resolve, reject) => {
        guild.members.fetch({ user, force }).then(resolve).catch(async error => {
            if (guild.available && error.message.includes("Unknown")) return resolve(null);
            return resolve(await guild.members.fetch({ user, force }));
        });
    });
}*/

const rateLimitSafe = rateLimit({
    windowMs: 2000, // 2 seconds
    max: 25, // 25 requests per 2 seconds
    standardHeaders: true,
    legacyHeaders: false,
    message: "You are being rate-limited. Please try again later."
});
const rateLimitUnsafe = rateLimit({
    windowMs: 10000, // 10 seconds
    max: 10, // 10 per 10 seconds
    standardHeaders: true,
    legacyHeaders: false,
    message: "You are being rate-limited. Send fewer requests. Try again later."
});

const root = "./web";

app.get("/login/discord", rateLimitUnsafe, (req, res) => res.redirect("")); // scrubbed

app.get("/logout", rateLimitUnsafe, (req, res) => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) return res.redirect("/");

    const key = sessions.find("sessionToken", sessionToken);
    if (!key) return res.redirect("/");

    sessions.delete(key);

    res.clearCookie("session_token").redirect("/");
});

app.get("/authorize", rateLimitUnsafe, async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect("/");

    try {
        const tokenResponseData = await request("https://discord.com/api/oauth2/token", {
            method: "POST",
            body: new URLSearchParams({
                client_id: client.config.application.clientId,
                client_secret: process.env.ASH_CLIENT_SECRET,//client.config.application.clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: "", // scrubbed
                scope: "identify",
            }).toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const oauthData = await getJSONResponse(tokenResponseData.body);
        if (!oauthData.access_token) return res.redirect("/");

        const userResponseData = await request("https://discord.com/api/users/@me", {
            headers: { authorization: `${oauthData.token_type} ${oauthData.access_token}` }
        });

        const userIdentity = await getJSONResponse(userResponseData.body);
        if (!userIdentity.id) return res.redirect("/");

        const member = await getMember(userIdentity.id, true);
        if (!member || member instanceof Error) return res.redirect("/");

        const sessionToken = nanoid();

        sessions.set(userIdentity.id, {
            sessionToken,
            accessToken: oauthData.access_token,
            tokenType: oauthData.token_type,
            refreshToken: oauthData.refresh_token,
            tokenExpiresIn: Date.now() + oauthData.expires_in * 1000,
            userIdentity
        });

        sessions.set(userIdentity.id, userIdentity.global_name, "userIdentity.display_name");

        res.cookie("session_token", sessionToken, { maxAge: oauthData.expires_in * 1000, httpOnly: true, sameSite: "strict" }).sendFile("private/authorize.html", { root });
    } catch (error) {
        console.error(error);
        return res.redirect("/");
    }
});

app.get("/identify", async (req, res) => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) return res.sendStatus(401);

    const data = sessions.find("sessionToken", sessionToken);
    if (!data) return res.sendStatus(401);

    const id = data.userIdentity.id;

    if (!client.stormworks.players.getSteamIdFromDiscordId(id)) return res.sendStatus(403);

    // for testing sessions don't expire
    //if (Date.now() > data.tokenExpiresIn) { sessions.delete(id); return res.sendStatus(401); }

    const member = await getMember(id);
    if (!member || member instanceof Error) {
        res.sendStatus(403);
    } else {
        sessions.set(id, member.user.username, "userIdentity.username");
        sessions.set(id, member.user.display_name, "userIdentity.display_name");
        sessions.set(id, member.user.avatar, "userIdentity.avatar");
        // Banner and accent color are not available unless member has been previously force-fetched
        //if (member.user.banner) sessions.set(id, member.user.banner, "userIdentity.banner");
        if (member.user.accentColor) sessions.set(id, member.user.accentColor, "userIdentity.accent_color");

        res.send({
            id,
            username: data.userIdentity.username,
            display_name: data.userIdentity.display_name,
            avatar: data.userIdentity.avatar,
            //banner: data.userIdentity.banner,
            accent_color: data.userIdentity.accent_color,
            //flags: data.userIdentity.flags,
            //premium_type: data.userIdentity.premium_type,
            primary_account_id: client.economy.getPrimaryAccount(id, false)?.id,
            steam_id: client.stormworks.players.getSteamIdFromDiscordId(id) ?? ""
        });
    }
});

// Ash API
app.use("/api", rateLimitSafe);
app.use("/api", async (req, res, next) => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) return res.sendStatus(401);

    const data = sessions.find("sessionToken", sessionToken);
    if (!data) return res.sendStatus(401);

    const userId = data.userIdentity.id;

    if (!client.stormworks.players.getSteamIdFromDiscordId(userId)) return res.sendStatus(403);

    //if (Date.now() > data.tokenExpiresIn) { sessions.delete(userId); return res.sendStatus(401); }

    const member = await getMember(userId);
    if (!member || member instanceof Error) return res.sendStatus(403);

    req.userId = userId;
    req.member = member;

    next();
});

// Search
app.get("/api/search", (req, res) => {
    const text = (req.query.q ?? "").substring(0, 64);

    const response = [];

    if (Boolean(text)) {
        const searchItems = [];

        for (const [id, account] of client.economy.accounts) searchItems.push({
            id,
            type: "account",
            name: account.name,
            owner: account.type === client.economy.enums.accountTypes("Personal") ? undefined
                        : account.type === client.economy.enums.accountTypes("Faction") ? client.factions.factions.get(account.ownerId).name
                        : account.type === client.economy.enums.accountTypes("Nation") ? client.nations.nations.get(account.ownerId).name
                        : undefined,
            accountType: account.type,
        });

        for (const [id, faction] of client.factions.factions) searchItems.push({
            id,
            type: "faction",
            name: faction.name,
            // owner incorrect; should be nationName
            owner: client.nations.nations.has(faction.nationId) ? client.nations.nations.get(faction.nationId).name : undefined,
            shortDescription: faction.shortDescription
        });

        for (const [id, nation] of client.nations.nations) searchItems.push({
            id,
            type: "nation",
            name: nation.name,
            shortDescription: nation.shortDescription
        });

        const results = fuzzysort.go(text, searchItems, {
            keys: ["id", "name", "owner", "shortDescription"],
            limit: 20,
            threshold: -100,
            scoreFn: a => Math.max(a[0] ? a[0].score + 40 : -1000, a[1] ? a[1].score + 30 : -1000, a[2] ? a[2].score : -1000, a[3] ? a[3].score : -1000)
        });

        for (const result of results) response.push({
            title: result[1] ? fuzzysort.highlight(result[1], '<span style="color: #6da1ff">', "</span>").replaceAll("(", "[").replaceAll(")", "]") : result.obj.name,
            balance: result.obj.type === "account" ? client.economy.accounts.get(result.obj.id, "balance") : undefined,
            subtext: result.obj.type === "account" ? `Account ${result.obj.id}` : result.obj.type === "faction" ? "Faction" : "Nation",
            link: `/ash/${result.obj.type === "account" ? "account" : result.obj.type === "faction" ? "faction" : "nation"}/${result.obj.id}`,
            image: result.obj.type === "account" ? (result.obj.accountType === client.economy.enums.accountTypes("Faction") ? client.factions.factions.get(client.economy.accounts.get(result.obj.id, "ownerId"))?.displayImage : result.obj.accountType === client.economy.enums.accountTypes("Nation") ? client.nations.nations.get(client.economy.accounts.get(result.obj.id, "ownerId"))?.displayImage : null) : result.obj.type === "faction" ? client.factions.factions.get(result.obj.id, "displayImage") : client.nations.nations.get(result.obj.id, "displayImage")
        });
    } else {
        const accounts = client.economy.getAccounts(req.userId);
        const factions = client.factions.getFactions(req.userId);
        const nations = client.nations.getNations(req.userId);

        for (const id of accounts) {
            const account = client.economy.accounts.get(id);
            response.push({
                title: account.name,
                balance: account.balance,
                subtext: `Account ${id}`,
                link: `/ash/account/${id}`,
                image: account.type === client.economy.enums.accountTypes("Faction") ? client.factions.factions.get(account.ownerId)?.displayImage : account.type === client.economy.enums.accountTypes("Nation") ? client.nations.nations.get(account.ownerId)?.displayImage : null
            });
        }
        for (const id of factions) {
            response.push({
                title: client.factions.factions.get(id, "name"),
                subtext: "Faction",
                link: `/ash/faction/${id}`,
                image: client.factions.factions.get(id, "displayImage")
            });
        }
        for (const id of nations) {
            response.push({
                title: client.nations.nations.get(id, "name"),
                subtext: "Nation",
                link: `/ash/nation/${id}`,
                image: client.nations.nations.get(id, "displayImage")
            });
        }
    }

    res.send(response);
});

// Transfer money
app.get("/api/account/transfer", rateLimitUnsafe, (req, res) => {
    const sourceAccount = client.economy.getAccount(req.query.source);
    const amount = parseInt(req.query.amount, "10");
    const targetAccount = client.economy.getAccount(req.query.target);

    if (!sourceAccount) return res.sendStatus(400);
    if (isNaN(amount) || amount < 0) return res.sendStatus(400);
    if (!targetAccount) return res.sendStatus(400);

    if (!sourceAccount.hasPermission(req.userId, client.economy.enums.permissions("UseAccount"))) return res.sendStatus(403);
    if (sourceAccount.balance < amount) return res.sendStatus(400);

    // todo handle taxes like pay command
    // TODO there is no central transaction flow?? fix??
    // IRS.js is watching

    sourceAccount.balance -= amount;
    targetAccount.balance += amount;

    sourceAccount.addHistory(`📤 <@!${req.userId}> transferred ${amount.toLocaleString()} ${client.config.economy.moneySymbol} to account #${targetAccount.id}`);
    targetAccount.addHistory(`📥 Received ${amount.toLocaleString()} ${client.config.economy.moneySymbol} from account #${sourceAccount.id}`);

    res.send({
        source_new_balance: sourceAccount.balance,
        target_new_balance: targetAccount.balance
    });
});

const graphQLSchema = makeExecutableSchema({
    typeDefs: fs.readFileSync("./web/referenceSchema.graphql").toString(),
    resolvers: {
        Account: {
            __resolveType(object, context, info) {
                switch (object.type) {
                    case client.economy.enums.accountTypes("Personal"): {
                        return "PersonalAccount"
                    }
                    case client.economy.enums.accountTypes("Faction"): {
                        return "FactionAccount"
                    }
                    case client.economy.enums.accountTypes("Nation"): {
                        return "NationAccount"
                    }
                }
                return null;
            }
        },
        GroupRank: {
            __resolveType(object, context, info) {
                return object instanceof GroupRank ? "FactionRank" : "NationRank";
            }
        },
        GroupMember: {
            __resolveType(object, context, info) {
                return object instanceof GroupMember ? "FactionMember" : "NationMember";
            }
        },
        Group: {
            __resolveType(object, context, info) {
                return object instanceof Faction ? "Faction" : "Nation";
            }
        },
        Vehicle: {
            __resolveType(object, context, info) {
                switch (object.type) {
                    case client.vehicles.enums.vehicleTypes("Personal"): {
                        return "PersonalVehicle"
                    }
                    case client.vehicles.enums.vehicleTypes("Faction"): {
                        return "FactionVehicle"
                    }
                    case client.vehicles.enums.vehicleTypes("Nation"): {
                        return "NationVehicle"
                    }
                }
                return null;
            }
        }
    }
});

class User {
    constructor(id, req) {
        this.id = id;
        this._req = req;
    }

    get username() {
        return new Promise(async (resolve, reject) => {
            const member = await getMember(this.id);
            if (!member || member instanceof Error) return resolve(null);
            resolve(member.user.username);
        });
    }
    get display_name() {
        return new Promise(async (resolve, reject) => {
            const member = await getMember(this.id);
            if (!member || member instanceof Error) return resolve(null);
            resolve(member.user.username);//displayName);
        });
    }
    get avatar() {
        return new Promise(async (resolve, reject) => {
            const member = await getMember(this.id);
            if (!member || member instanceof Error) return resolve(null);
            resolve(member.user.avatar);
        });
    }
    /*get banner() {
        return new Promise(async (resolve, reject) => {
            const member = await getMember(this.id);
            if (!member || member instanceof Error) return resolve(null);
            if (!member.user.banner) {
                client.users.fetch(this.id, { force: true }).then(user => resolve(user.banner)).catch(() => resolve(null));
            } else resolve(member.user.banner);
        });
    }*/
    get color() {
        return new Promise(async (resolve, reject) => {
            const member = await getMember(this.id);
            if (!member || member instanceof Error) return resolve(null);
            if (!member.user.accentColor) {
                client.users.fetch(this.id, { force: true }).then(user => resolve(user.accentColor)).catch(() => resolve(null));
            } else resolve(member.user.accentColor);
        });
    }

    get verified() { return client.stormworks.players.has(this.id); }
    get steam_id() { return client.stormworks.players.getSteamIdFromDiscordId(this.id); }
    get verification_timestamp() { return client.stormworks.players.has(this.id) ? client.stormworks.players.get(this.id, "verifiedTimestamp") : null; }
    get playtime() { return client.stormworks.players.has(this.id) ? client.stormworks.players.get(this.id, "playTime") : null; }
    get times_joined() { return client.stormworks.players.has(this.id) ? client.stormworks.players.get(this.id, "timesJoined") : null; }
    get deaths() { return client.stormworks.players.has(this.id) ? client.stormworks.players.get(this.id, "timesDied") : null; }
    get last_played() { return client.stormworks.players.has(this.id) ? client.stormworks.players.get(this.id, "lastPlayed") : null; }

    get accounts() {
        return client.economy.getAccounts(this.id).map(accountId => Account.typedAccountObject(accountId, this._req));
    }
    get nations() {
        return client.nations.getNations(this.id).map(nationId => new Nation(nationId, this._req));
    }
    get factions() {
        return client.factions.getFactions(this.id).map(factionId => new Faction(factionId, this._req));
    }
    get vehicles() {
        return client.vehicles.getVehicles(this.id).filter(vehicle => !vehicle.hidden || vehicle.canUse(this._req.userId)).map(vehicleId => Vehicle.typedVehicleObject(vehicleId, this._req));
    }

    get primary_account() { return this.verified || client.economy.getPrimaryAccount(this.id, false) ? Account.typedAccountObject(client.economy.getPrimaryAccount(this.id).id, this._req) : null; }
}

class AccountUser {
    constructor(account, userId, req) {
        this._req = req;
        this._userId = userId;
        this.account = account;
    }

    get user() { return new User(this._userId, this._req); }
    get p_use() { return this.account._account.hasPermission(this._userId, client.economy.enums.permissions("UseAccount")); }
    get p_delete() { return this.account._account.hasPermission(this._userId, client.economy.enums.permissions("DeleteAccount")); }
    get p_rename() { return this.account._account.hasPermission(this._userId, client.economy.enums.permissions("RenameAccount")); }
}

class Account {
    constructor(id, req) {
        this.id = id;
        this._req = req;
        this._account = client.economy.getAccount(id);
    }

    get name() { return this._account.name; }
    get type() { return this._account.type; }
    get balance() { return this._account.balance; }
    get history() { return this._account.hasPermission(this._req.userId, client.economy.enums.permissions("UseAccount")) ? this._account.history : null; }

    get users() { return this._account.getUsersWithPermission(client.economy.enums.permissions("UseAccount"), client.economy.enums.permissions("DeleteAccount"), client.economy.enums.permissions("RenameAccount")).map(userId => new AccountUser(this, userId, this._req)); }

    get current_user() { return new AccountUser(this, this._req.userId, this._req); }

    static typedAccountObject(id, req) {
        switch (client.economy.accounts.get(id, "type")) {
            case client.economy.enums.accountTypes("Personal"): {
                return new PersonalAccount(id, req);
            }
            case client.economy.enums.accountTypes("Faction"): {
                return new FactionAccount(id, req);
            }
            case client.economy.enums.accountTypes("Nation"): {
                return new NationAccount(id, req);
            }
        }
        return null;
    }
}
class PersonalAccount extends Account {
    get owner() { return new User(this._account.owner, this._req); }
}
class FactionAccount extends Account {
    get owner() { return new Faction(this._account.ownerId, this._req); }
}
class NationAccount extends Account {
    get owner() { return new Nation(this._account.ownerId, this._req); }
}

class GroupRank {
    constructor(rank, req) {
        this._rank = rank;
        this._req = req;
        this.group = rank.group;
    }

    get id() { return this._rank.id; }
    get name() { return this._rank.name; }
    get display_order() { return this._rank.displayOrder; }
    get permissions() { return this._rank.permissions; }
    get members() { return this._rank.members.map(member => new GroupMember(member, this._req)); }
}

class GroupMember {
    constructor(member, req) {
        this._member = member;
        this._req = req;
        this.group = member.group;
    }

    get user() { return new User(this._member.id, this._req); }
    get rank() { return new GroupRank(this._member.rank, this._req); }

    get p_use_economy_accounts() { return this._member.canUseEconomyAccounts; }
    get p_delete_economy_accounts() { return this._member.canDeleteEconomyAccounts; }
    get p_rename_economy_accounts() { return this._member.canRenameEconomyAccounts; }
    get p_manage_members() { return this._member.canManageMembers; }
    get p_edit_details() { return this._member.canEditDetails; }
}

class Group {
    constructor(id, req) {
        this.id = id;
        this._req = req;
        this._group = null;
    }

    get owner() { return new GroupMember(this._group.owner, this._req); }

    get name() { return this._group.name; }
    get description() { return this._group.description; }
    get short_description() { return this._group.shortDescription; }
    get color() { return parseInt(this._group.color.substring(1), 16); } // hex to base 10
    get display_image() { return this._group.displayImage; }
    get creation_timestamp() { return this._group.creationTimestamp; }

    get current_user_invite_pending() { return this._group.invitedMembers.includes(this._req.userId); }
    get members() { return this._group.members.map(member => new GroupMember(member, this._req)); }
    get ranks() { return this._group.ranks.map(rank => new GroupRank(rank, this._req)); }

    get current_user() { const member = this._group.getMember(this._req.userId); return member ? new GroupMember(member, this._req) : null; }
}

class FactionConfiguration {
    constructor(group, req) {
        this._group = group;
        this._req = req;
    }

    get primary_account() { return new FactionAccount(this._group.primaryAccount.id, this._req); }
}

class Faction extends Group {
    constructor(id, req) {
        super(id, req);
        this._group = client.factions.getFaction(id);
    }

    get owner() { return new GroupMember(this._group.owner, this._req); }

    get members() { return this._group.members.map(member => new GroupMember(member, this._req)); }
    get ranks() { return this._group.ranks.map(rank => new GroupRank(rank, this._req)); }

    get nation() { return this._group.nation ? new Nation(this._group.nationId, this._req): null; }
    get accounts() { return this._group.economyAccounts.map(account => new FactionAccount(account.id, this._req)); }
    get vehicles() { return this._group.vehicles.filter(vehicle => !vehicle.hidden || vehicle.canUse(this._req.userId)).map(vehicle => new FactionVehicle(vehicle.id, this._req)); }
    get vehicle_templates() { return this._group.vehicleTemplates.filter(template => template.canAdministrate(this._req.userId)).map(template => new VehicleTemplate(template.id, this._req)); }

    get configuration() { return new FactionConfiguration(this._group, this._req); }
}

class NationRank extends GroupRank {
    get members() { return this._rank.members.map(member => new NationMember(member, this._req)); }
    get taxes() { return this._rank.taxes; }
}

class NationMember extends GroupMember {
    get rank() { return new NationRank(this._member.rank, this._req); }
}

class NationConfiguration {
    constructor(group, req) {
        this._group = group;
        this._req = req;
    }

    get faction_income_tax() { return this._group.factionIncomeTax; }
    get faction_outgoing_tax() { return this._group.factionOutgoingTax; }
    get primary_account() { return new NationAccount(this._group.primaryAccount.id, this._req); }
    get tax_destination_account() { return new NationAccount(this._group.taxDestinationAccount.id, this._req); }
}

class Nation extends Group {
    constructor(id, req) {
        super(id, req);
        this._group = client.nations.getNation(id);
    }

    get owner() { return new NationMember(this._group.owner, this._req); }

    get members() { return this._group.members.map(member => new NationMember(member, this._req)); }
    get ranks() { return this._group.ranks.map(rank => new NationRank(rank, this._req)); }

    get accounts() { return this._group.economyAccounts.map(account => new NationAccount(account.id, this._req)); }
    get vehicles() { return this._group.vehicles.filter(vehicle => !vehicle.hidden || vehicle.canUse(this._req.userId)).map(vehicle => new NationVehicle(vehicle.id, this._req)); }
    get factions() { return this._group.factions.map(faction => new Faction(faction.id, this._req)); }

    get configuration() { return new NationConfiguration(this._group, this._req); }
}

class VehicleTemplate {
    constructor(id, req) {
        this.id = id;
        this._req = req;
        this._template = client.vehicles.getTemplate(id);
    }

    get name() { return this._template.name; }
    get description() { return this._template.description; }
    get image() { return this._template.image; }

    get vehicle_type() { return this._template.vehicleType; }
    get creation_timestamp() { return this._template.creationTimestamp; }

    get is_approved() { return this._template.isApproved; }
    get vehicles_created() { return this._template.vehiclesCreated; }

    get creator() { return new User(this._template.creator, this._req); }
    get faction() { return new Faction(this._template.factionId, this._req); }

    get administrators() { return this._template.administrators.map(id => new User(id, this._req)); }
}

class Vehicle {
    constructor(id, req) {
        this.id = id;
        this._req = req;
        this._vehicle = client.vehicles.getVehicle(id);
    }

    get name() { return this._vehicle.name; }
    get type() { return this._vehicle.type; }
    get description() { return this._vehicle.description; }
    get image() { return this._vehicle.image; }

    get vehicle_type() { return this._vehicle.vehicleType; }
    get note() { return this._vehicle.canUse(this._req.userId) ? this._vehicle.note : null; }
    get creation_timestamp() { return this._vehicle.creationTimestamp; }
    get hidden() { return this._vehicle.hidden; }

    get faction_name() { return this._vehicle.faction.name; }
    get faction_display_image() { return this._vehicle.faction.displayImage; }
    get faction_color() { return parseInt(this._vehicle.faction.color.substring(1), 16); } // hex to base 10
    get faction() { return new Faction(this._vehicle.factionId, this._req); }

    get usage_time() { return this._vehicle.usageTime; }
    get mileage() { return this._vehicle.mileage; }
    get condition() { return this._vehicle.condition; }

    get administrators() { return this._vehicle.administrators.map(id => new User(id, this._req)); }
    get users() { return this._vehicle.users.map(id => new User(id, this._req)); }

    static typedVehicleObject(id, req) {
        switch (client.vehicles.vehicles.get(id, "type")) {
            case client.vehicles.enums.vehicleTypes("Personal"): {
                return new PersonalVehicle(id, req);
            }
            case client.vehicles.enums.vehicleTypes("Faction"): {
                return new FactionVehicle(id, req);
            }
            case client.vehicles.enums.vehicleTypes("Nation"): {
                return new NationVehicle(id, req);
            }
        }
        return null;
    }
}
class PersonalVehicle extends Vehicle {
    get owner() { return new User(this._vehicle.owner, this._req); }
}
class FactionVehicle extends Vehicle {
    get owner() { return new Faction(this._vehicle.ownerId, this._req); }
}
class NationVehicle extends Vehicle {
    get owner() { return new Nation(this._vehicle.ownerId, this._req); }
}

// req { userId: current user Discord ID }
const graphQLRoot = {
    current_user: function(args, req) {
        return new User(req.userId, req);
    },

    user: async function(args, req) {
        return new User(args.id, req);
    },
    account: function(args, req) {
        if (!client.economy.accounts.has(args.id)) return null;
        return Account.typedAccountObject(args.id, req);
    },
    nation: function(args, req) {
        if (!client.nations.nations.has(args.id)) return null;
        return new Nation(args.id, req);
    },
    faction: function(args, req) {
        if (!client.factions.factions.has(args.id)) return null;
        return new Faction(args.id, req);
    },
    vehicle: function(args, req) {
        if (!client.vehicles.vehicles.has(args.id)) return null;
        const vehicle = client.vehicles.getVehicle(args.id); if (vehicle.hidden && !vehicle.canUse(req.userId)) return null;
        return Vehicle.typedVehicleObject(args.id, req);
    },
    vehicle_template: function(args, req) {
        if (!client.vehicles.vehicleTemplates.has(args.id)) return null;
        const vehicleTemplate = client.vehicles.getTemplate(args.id); if (!vehicleTemplate.canAdministrate(req.userId)) return null;
        return new VehicleTemplate(args.id, req);
    },

    user_from_steam_id: function(args, req) {
        const id = client.stormworks.players.getDiscordIdFromSteamId(args.id);
        if (!id) return null;
        return new User(id, req);
    },

    nations: function(args, req) {
        return client.nations.nations.map((_, id) => new Nation(id, req));
    },
    factions: function(args, req) {
        return client.factions.factions.map((_, id) => new Faction(id, req));
    },
}

app.use("/api/graphql", graphqlHTTP({
    schema: graphQLSchema,
    rootValue: graphQLRoot,
    graphiql: true // temporary
}));

client.graphql = {
    schema: graphQLSchema,
    root: graphQLRoot
}

// Serve Ash page below
app.use("/ash", async (req, res) => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) return res.redirect("/");

    const userId = sessions.findKey("sessionToken", sessionToken);
    if (!userId) return res.redirect("/");

    if (!client.stormworks.players.getSteamIdFromDiscordId(userId)) return res.redirect("/");

    const member = await getMember(userId);
    if (!member || member instanceof Error) return res.redirect("/");

    res.sendFile("private/ash.html", { root });
});

// Perform Git pull update on web request so i can update ash from my pc
/*const { ActivityType } = require("discord.js");
app.post("/ashupd", async (req, res) => {
    if (req.body.key === "") { // scrubbed
        await client.gitPull();
        await client.user.setPresence({ activities: [{ type: ActivityType.Playing, name: "ashupd" }] });
        res.send("OK");
        process.exit(0);
    } else res.sendStatus(403);
});*/

app.listen(80, () => client.log("bgGreen", "WEB", "Web server started on port 80"));