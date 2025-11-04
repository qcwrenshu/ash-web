/*
Ash Web
@qcwrenshu

home.js services the home page.

It simply commands the sidebar to show information for your user.
A content "feed" was planned but never implemented. For now, a duplicate of this information is shown in the main content area as well. 

*/

import { useQuery, gql } from "@apollo/client";

import Link from "../components/Link.js";
import ErrorMessage from "../components/ErrorMessage.js";
import Sidebar from "../components/Sidebar.js";
import DiscordAvatarPicture from "../components/DiscordAvatarPicture.js";

function SidebarItem(props) {
    return (
        <Link className="panel-section-item" to={props.link}>
            {props.avatar ? <DiscordAvatarPicture size="24" name={props.name} id={props.userId} avatar={props.avatar} /> : props.image ? <img src={props.image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" /> : null}
            <span className={"panel-section-item-main" + (props.highlight ? " highlight-yellow" : "")} style={props.highlight ? { padding: "3px 5px" } : null}>{props.title}</span>
            <span className="subtext">{props.subtext}</span>
            <span style={{ marginLeft: "auto" }}>{props.text}</span>
        </Link>
    );
}

function SidebarAccount(props) {
    const account = props.data;
    switch (account.type) {
        case 0: { // Personal
            return <SidebarItem highlight={props.highlight} title={account.name} subtext={account.id} text={`${account.balance.toLocaleString()} SR`} link={`/ash/account/${account.id}`} avatar={account.owner.avatar} name={account.owner.display_name} userId={account.owner.id} />;
        }
        case 1: { // Faction
            return <SidebarItem highlight={props.highlight} title={account.name} subtext={account.id} text={`${account.balance.toLocaleString()} SR`} link={`/ash/account/${account.id}`} image={account.owner.display_image} />;
        }
        case 2: { // Nation
            return <SidebarItem highlight={props.highlight} title={account.name} subtext={account.id} text={`${account.balance.toLocaleString()} SR`} link={`/ash/account/${account.id}`} image={account.owner.display_image} />;
        }
    }
}
function SidebarAccountsSection() {
    const userAccountsQuery = gql`
        query UserAccounts {
            current_user {
                accounts {
                    id
                    name
                    balance
                    type
                    ... on PersonalAccount {
                        owner {
                            id
                            display_name
                            avatar
                        }
                    }
                    ... on NationAccount {
                        owner {
                            display_image
                        }
                    }
                    ... on FactionAccount {
                        owner {
                            display_image
                        }
                    }
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(userAccountsQuery);

    if (loading) return <div className="loading-icon" style={{ width: "24px", height: "24px" }} />;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    return (
        <div className="panel-section">
            {data.current_user.accounts.map(account => <SidebarAccount key={account.id.toString()} data={account} highlight={account.id === core.userData.primary_account_id} />)}
        </div>
    );
}

function SidebarGroup(props) {
    const group = props.data;
    switch (props.data.__typename) {
        case "Faction": {
            return <SidebarItem highlight={props.highlight} title={group.name} link={`/ash/faction/${group.id}`} image={group.display_image} />;
        }
        case "Nation": {
            return <SidebarItem highlight={props.highlight} title={group.name} link={`/ash/nation/${group.id}`} image={group.display_image} />;
        }
    }
}
function SidebarFactionsSection() {
    const userFactionsQuery = gql`
        query UserFactions {
            current_user {
                factions {
                    id
                    name
                    display_image
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(userFactionsQuery);

    if (loading) return <div className="loading-icon" style={{ width: "24px", height: "24px" }} />;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    return (
        <div className="panel-section">
            {data.current_user.factions.map(group => <SidebarGroup key={group.id.toString()} data={group} />)}
        </div>
    );
}

function SidebarNationsSection() {
    const userNationsQuery = gql`
        query UserNations {
            current_user {
                nations {
                    id
                    name
                    display_image
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(userNationsQuery);

    if (loading) return <div className="loading-icon" style={{ width: "24px", height: "24px" }} />;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    return (
        <div className="panel-section">
            {data.current_user.nations.map(group => <SidebarGroup key={group.id.toString()} data={group} />)}
        </div>
    );
}

function Statstemp() {
    const userQuery = gql`
        query UserStatstemp {
            current_user {
                id
                username
                display_name
                avatar
                color
                verified
                steam_id
                verification_timestamp
                playtime
                times_joined
                deaths
                last_played
            }
        }
    `;

    const { loading, error, data } = useQuery(userQuery);

    if (loading) return <div className="loading-icon" style={{ width: "24px", height: "24px" }} />;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    return (
        <div className="panel-section">
            <span>id: {data.current_user.id}</span>
            <span>username: {data.current_user.username}</span>
            <span>display_name: {data.current_user.display_name}</span>
            <span>avatar: {data.current_user.avatar}</span>
            <span>color: {data.current_user.color}</span>
            <span>verified: {data.current_user.verified ? "true" : "false"}</span>
            <span>steam_id: {data.current_user.steam_id}</span>
            <span>core&gt;primary_account_id: {core.userData.primary_account_id}</span>
            <span>verification_timestamp: {data.current_user.verification_timestamp}</span>
            <span>playtime: {data.current_user.playtime}</span>
            <span>times_joined: {data.current_user.times_joined}</span>
            <span>deaths: {data.current_user.deaths}</span>
            <span>last_played: {data.current_user.last_played}</span>
        </div>
    );
}

export default function Home() {
    document.title = "StormLands";
    return (
        <div className="app">
            <Sidebar type={0} id={core.userData.id} />
            <div className="body" style={{ background: core.userData.accent_color ? `radial-gradient(800% 130% at 650% -50%, #${core.colorBase10toHex(core.userData.accent_color)}, transparent)` : null }}>
                <div className="body-inner">
                    <h1 style={{ fontSize: "3em" }}>Welcome, {core.userData.display_name}</h1>
                    <p>Welcome</p>
                    <h2>Accounts</h2>
                    <SidebarAccountsSection />
                    <h2>Factions</h2>
                    <SidebarFactionsSection />
                    <h2>Nations</h2>
                    <SidebarNationsSection />
                    <h2>User info debug</h2>
                    <Statstemp />
                </div>
            </div>
        </div>
    );
}