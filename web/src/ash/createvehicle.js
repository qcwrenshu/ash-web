/*
Ash Web
@qcwrenshu

createvehicle.js services the vehicle creation page.

It was never completed.

Note the Ash Vehicles system is omitted from Ash Public, so this page will not function!

*/

import { useState, useEffect } from "react";
import { useQuery, gql } from "@apollo/client";

import Link from "../components/Link.js";
import ErrorMessage from "../components/ErrorMessage.js";
import Popup from "../components/Popup.js";
import Sidebar from "../components/Sidebar.js";
import DiscordAvatarPicture from "../components/DiscordAvatarPicture.js";
import AshFooter from "../components/AshFooter.js";

function Create(props) {
    return (
        <div className="app">
            <div className="body" style={{ padding: "30px 40px" }}>
                <div className="body-inner" style={{ maxWidth: "1100px" }}>

                    <h1>OK</h1>

                </div>
            </div>
        </div>
    );
}

function NewTemplate(props) {
    const query = gql`
        query CreateVehicleNewTemplate($id: Int!) {
            faction(id: $id) {
                id
                name
                color
                display_image
                current_user {
                    rank {
                        permissions {
                            canDeleteEconomyAccounts
                        }
                    }
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(query, { variables: { id: props.factionId } });

    if (loading) return <div style={{ display: "flex", height: "80vh", alignItems: "center", justifyContent: "center" }}><div className="loading-icon" style={{ width: "48px", height: "48px" }} /></div>;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    document.title = `StormLands | Create new vehicle template`;

    return (
        <div className="app">
            <div className="body" style={{ padding: "30px 40px", background: `radial-gradient(800% 130% at 650% -50%, #${core.colorBase10toHex(data.faction.color)}, transparent)` }}>
                <div className="body-inner" style={{ maxWidth: "1100px", gap: "15px" }}>
                    <h1 style={{ fontSize: "3em" }}>Create new vehicle template</h1>

                    <div className="body-row" style={{ gap: "15px" }}>
                        <img src={data.faction.display_image} height="48" width="48" style={{ borderRadius: "var(--control-border-radius)" }} />
                        <h2>{data.faction.name}</h2>
                    </div>

                    <AshFooter anchorBottom text="Ash Vehicles" />
                </div>
            </div>
        </div>
    );
}

function Home(props) {
    const query = gql`
        query CreateVehicleHome {
            current_user {
                factions {
                    id
                    name
                    display_image
                    vehicle_templates {
                        id
                        name
                        vehicle_type
                        is_approved
                    }
                    current_user {
                        rank {
                            permissions {
                                canDeleteEconomyAccounts
                            }
                        }
                    }
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(query);

    if (loading) return <div style={{ display: "flex", height: "80vh", alignItems: "center", justifyContent: "center" }}><div className="loading-icon" style={{ width: "48px", height: "48px" }} /></div>;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    document.title = `StormLands | Create a vehicle`;

    return (
        <div className="app">
            <div className="body" style={{ padding: "30px 40px" }}>
                <div className="body-inner" style={{ maxWidth: "1100px" }}>
                    <h1 style={{ fontSize: "3em" }}>Create a vehicle</h1>
                    <p>Welcome to vehicle creation. Select a vehicle template to begin.</p>
                    <a href="https://docs.google.com/document/d/1Fohe_LEm7URJ86LsyirKWTcVgMA3wEveJMJfF-9BPSA/edit" target="_blank">Guide on Ash Vehicles</a>

                    <br />
                    <br />

                    <div className="panel-separator" />
                    {data.current_user.factions.filter(faction => faction.current_user.rank.permissions.canDeleteEconomyAccounts).map(faction =>
                        <div className="panel-section">
                            <h2 style={{ margin: "8px 0px 4px 0px" }}>{faction.name}</h2>
                            {faction.vehicle_templates.map(vehicleTemplate =>
                                <Link style={{ opacity: vehicleTemplate.is_approved ? null : 0.5 }} className="panel-section-item" to={vehicleTemplate.is_approved ? `/ash/createvehicle/${vehicleTemplate.id}` : null}>
                                    <img src={faction.display_image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" />
                                    <span className="panel-section-item-main">{vehicleTemplate.name}</span>
                                    <span className="subtext">{vehicleTemplate.vehicle_type === 0 ? "Ground" : vehicleTemplate.vehicle_type === 1 ? "Air" : "Sea"}</span>
                                </Link>
                            )}
                            <Link className="panel-section-item" to={`/ash/createvehicle/new/${faction.id}`}>
                                <span className="highlight-red material-symbols-rounded" style={{ borderRadius: "100%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>add</span>
                                <span className="panel-section-item-main">Create new vehicle template...</span>
                            </Link>
                            <div className="panel-separator" />
                        </div>
                    )}

                    <AshFooter anchorBottom text="Ash Vehicles" />
                </div>
            </div>
        </div>
    );
}

export default function CreateVehicle() {
    const pathNames = window.location.pathname.substring(1).split("/");
    pathNames.shift(); pathNames.shift();

    switch (pathNames.shift()) {
        case undefined: case "": {
            return <Home />;
        }
        case "new": {
            const str = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
            const factionId = Number(str);
            if (str === "" || isNaN(factionId)) return <ErrorMessage title="Not available" />;
            return <NewTemplate factionId={factionId} />;
        }
        default: {
            const str = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
            const vehicleId = Number(str);
            if (str === "" || isNaN(vehicleId)) return window.location.pathname = "/ash/createvehicle";
            return <Create vehicleId={vehicleId} />;
        }
    }
}