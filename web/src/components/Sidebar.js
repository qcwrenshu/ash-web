/*
Ash Web
@qcwrenshu

The Sidebar appears on the left side of every core Ash page.
It updates based on the entity being viewed:
    Home page: managed by home.js
    User: shows accounts, factions, nations, vehicles
    Faction: shows accounts, nation, vehicles
    Nation: shows accounts, factions, vehicles

It also renders the Ash footer.

*/

import { useQuery, gql } from "@apollo/client";

import Link from "../components/Link.js";
import ErrorMessage from "./ErrorMessage.js";
import DiscordAvatarPicture from "./DiscordAvatarPicture.js";
import AshFooter from "../components/AshFooter.js";

function SidebarItem(props) {
    return ( // todo replace with Link
        <Link className="panel-section-item" to={props.link}>
            {props.avatar ? <DiscordAvatarPicture size={24 * (props.size ?? 1)} name={props.name} id={props.userId} avatar={props.avatar} /> : props.image ? <img src={props.image} style={{ borderRadius: "var(--control-border-radius)" }} width={`${24 * (props.size ?? 1)}px`} height={`${24 * (props.size ?? 1)}px`} /> : null}
            <span className={"panel-section-item-main" + (props.highlight ? " highlight-yellow" : "")} style={{ fontSize: `${props.size ?? 1}em`, padding: props.highlight ? "3px 5px" : null }}>{props.title}</span>
            <span className="subtext">{props.subtext}</span>
            <span style={{ marginLeft: "auto" }}>{props.text}</span>
        </Link>
    );
}

export default function Sidebar(props) {
    // props.type:
    // 0: user
    // 1: faction
    // 2: nation

    const query = props.type === 0 ? gql`
        query Sidebar($id: String!) {
            root: user(id: $id) {
                id
                name: display_name
                color
                avatar
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
                factions {
                    id
                    name
                    display_image
                }
                nations {
                    id
                    name
                    display_image
                }
                vehicles {
                    id
                    name
                    faction_display_image
                }
                primary_account {
                    id
                }
            }
        }
    ` : props.type === 1 ? gql`
        query Sidebar($id: Int!) {
            root: faction(id: $id) {
                id
                name
                color
                display_image
                accounts {
                    id
                    name
                    balance
                }
                nation {
                    id
                    name
                    display_image
                }
                vehicles {
                    id
                    name
                    faction_display_image
                }
            }
        }
    ` : gql`
        query Sidebar($id: Int!) {
            root: nation(id: $id) {
                id
                name
                color
                display_image
                accounts {
                    id
                    name
                    balance
                }
                factions {
                    id
                    name
                    display_image
                }
                vehicles {
                    id
                    name
                    faction_display_image
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(query, { variables: { id: props.id } });

    if (loading) return <div className="panel" style={{ alignItems: "center", justifyContent: "center" }}><div className="loading-icon" style={{ width: "36px", height: "36px" }} /></div>;
    if (error) return <div className="panel"><ErrorMessage title="Error" message={error.message} /></div>;

    return (
        <div className="panel" style={{ background: data.root.color ? `radial-gradient(800% 130% at -550% -50%, #${core.colorBase10toHex(data.root.color)}, var(--control-background-disabled))` : null }}>
            <SidebarItem
                link={`/ash/${props.type === 0 ? "user" : props.type === 1 ? "faction" : "nation"}/${data.root.id}`}
                title={props.type === 0 ? (data.root.name ?? `#${data.root.id}`) : data.root.name}
                subtext={props.type === 1 ? "Faction" : props.type === 2 ? "Nation" : ""}
                avatar={data.root.avatar}
                userId={data.root.id}
                name={data.root.name}
                image={data.root.display_image}
                size={1.5}
            />

            {data.root.nation ? <div className="panel-separator" /> : null}
            {data.root.nation ? <SidebarItem link={`/ash/nation/${data.root.nation.id}`} title={data.root.nation.name} image={data.root.nation.display_image} /> : null}

            {data.root.accounts?.length > 0 ? <div className="panel-separator" /> : null}
            {data.root.accounts?.length > 0 ? <h2 style={{ margin: "4px 0" }}>Accounts</h2> : null}
            {data.root.accounts?.map(account =>
                <SidebarItem
                    link={`/ash/account/${account.id}`}
                    title={account.name}
                    text={`${account.balance.toLocaleString()} SR`}
                    subtext={account.id}
                    avatar={account.owner?.avatar}
                    userId={account.owner?.id}
                    name={account.owner?.display_name}
                    image={props.type === 0 ? account.owner?.display_image : data.root.display_image}
                    key={`A:${account.id}`}
                    highlight={data.root.primary_account && account.id === data.root.primary_account.id}
                />
            )}

            {data.root.factions?.length > 0 ? <div className="panel-separator" /> : null}
            {data.root.factions?.length > 0 ? <h2 style={{ margin: "4px 0" }}>Factions</h2> : null}
            {data.root.factions?.map(faction =>
                <SidebarItem
                    link={`/ash/faction/${faction.id}`}
                    title={faction.name}
                    image={faction.display_image}
                    key={`F:${faction.id}`}
                />
            )}

            {data.root.nations?.length > 0 ? <div className="panel-separator" /> : null}
            {data.root.nations?.length > 0 ? <h2 style={{ margin: "4px 0" }}>Nations</h2> : null}
            {data.root.nations?.map(nation =>
                <SidebarItem
                    link={`/ash/nation/${nation.id}`}
                    title={nation.name}
                    image={nation.display_image}
                    key={`N:${nation.id}`}
                />
            )}

            {data.root.vehicles?.length > 0 ? <div className="panel-separator" /> : null}
            {data.root.vehicles?.length > 0 ? <h2 style={{ margin: "4px 0" }}>Vehicles</h2> : null}
            {data.root.vehicles?.map(vehicle =>
                <SidebarItem
                    link={`/ash/vehicle/${vehicle.id}`}
                    title={vehicle.name}
                    subtext={vehicle.id}
                    image={vehicle.faction_display_image}
                    key={`V:${vehicle.id}`}
                />
            )}

            <div className="panel-separator" style={{ marginTop: "auto" }} />
            <AshFooter />
        </div>
    );
}