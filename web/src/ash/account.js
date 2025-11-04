/*
Ash Web
@qcwrenshu

account.js services the account page.

Including
    showing account details,
    updating the sidebar (though this logic is in Sidebar.js),
    and transferring funds through a popup.
Other features were never completed.

*/

import { useState, useEffect } from "react";
import { useQuery, gql } from "@apollo/client";

import Link from "../components/Link.js";
import ErrorMessage from "../components/ErrorMessage.js";
import Popup from "../components/Popup.js";
import Sidebar from "../components/Sidebar.js";
import DiscordAvatarPicture from "../components/DiscordAvatarPicture.js";

function UsersSection({ account }) {
    const query = gql`
        query AccountUsers($id: Int!) {
            account(id: $id) {
                id
                ...on PersonalAccount {
                    owner {
                        id
                    }
                }
                ...on FactionAccount {
                    owner {
                        owner {
                            user {
                                id
                            }
                        }
                    }
                }
                ...on NationAccount {
                    owner {
                        owner {
                            user {
                                id
                            }
                        }
                    }
                }
                users {
                    user {
                        id
                        display_name
                        avatar
                    }
                    p_use
                    p_delete
                    p_rename
                }
            }
        }
    `;

    const { loading, error, data } = useQuery(query, { variables: { id: account.id } });

    if (loading) return <div className="loading-icon" style={{ width: "24px", height: "24px" }} />;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    return (
        <div className="body-row" style={{ marginBottom: "8px" }}>
            {data.account.users.map(user => <Link to={`/ash/user/${user.user.id}`} className={`chip ${user.user.id === core.userData.id ? "highlight-green" : user.user.id === (account.type === 0 ? data.account.owner.id : data.account.owner.owner.user.id) ? "highlight-blue" : "highlight"} body-row`} style={{ gap: "10px", padding: "6px 10px", borderRadius: "var(--control-border-radius-alt)", color: "var(--text-color)", textDecoration: "none" }}><DiscordAvatarPicture size="24" name={user.user.display_name} id={user.user.id} avatar={user.user.avatar} /> {user.user.display_name ?? `#${user.user.id}`} {user.p_use ? <span className="material-symbols-rounded">attach_money</span> : null} {user.p_rename ? <span className="material-symbols-rounded">edit</span> : null} {user.p_delete ? <span className="material-symbols-rounded">delete</span> : null}</Link>)}
        </div>
    );
}

function SourceAccountSelection(props) {
    const [selectedAccountId, setSelectedAccountId] = useState(props.default);

    const query = gql`
        query SourceAccountSelection {
            current_user {
                accounts {
                    id
                    name
                    balance
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

    const { loading, error, data } = useQuery(query);

    if (loading) return <div className="loading-icon" style={{ width: "24px", height: "24px" }} />;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    return (
        <div className="list" style={{ maxHeight: "207px" }}>
            <div className="list-anchor panel-section-item">
                <span className="panel-section-item-main" style={{ opacity: 0.5 }}>Account ID</span>
                <input value={selectedAccountId} onChange={e => { const value = e.target.value === "" ? "" : Math.max(parseInt(e.target.value, "10"), 0); setSelectedAccountId(value); props.onChange(value === "" ? core.userData.primary_account_id : value); }} min="0" type="number" style={{ width: "100px" }} />
            </div>
            {data.current_user.accounts.map(account =>
                <div onClick={() => { setSelectedAccountId(account.id); props.onChange(account.id); }} key={account.id} className={`list-item${account.id === selectedAccountId ? " selected" : ""} panel-section-item`}>
                    {account.owner.avatar ? <DiscordAvatarPicture size="24" name={account.owner.display_name} id={account.owner.id} avatar={account.owner.avatar} /> : <img src={account.owner.display_image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" />}
                    <span className="panel-section-item-main" style={account.id === props.default ? { color: "var(--highlight-yellow-color)" } : null}>{account.name}</span>
                    <span className="subtext">{account.id}</span>
                    <span style={{ marginLeft: "auto" }}>{account.balance.toLocaleString()} SR</span>
                </div>
            )}
        </div>
    );
}

function TransferMoney(props) {
    const [popupVisible, setPopupVisible] = useState(false);

    const [working, setWorking] = useState(false);

    const [successPopupVisible, setSuccessPopupVisible] = useState(false);

    const [sourceAccountId, setSourceAccountId] = useState(props.default);
    const [moneyAmount, setMoneyAmount] = useState("");

    useEffect(() => {
        addEventListener("keydown", e => { if (e.code === "Escape") { setPopupVisible(false); setSuccessPopupVisible(false); } });
    });

    const query = gql`
        query TransferMoney($id: Int!) {
            account(id: $id) {
                id
                name
                balance
                ...on PersonalAccount {
                    owner {
                        id
                        display_name
                        avatar
                    }
                }
                ...on FactionAccount {
                    owner {
                        name
                        display_image
                    }
                }
                ...on NationAccount {
                    owner {
                        name
                        display_image
                    }
                }
                current_user {
                    p_use
                }
            }
        }
    `;
    const { loading, error, data } = useQuery(query, { variables: { id: sourceAccountId } });

    if (data?.account && Number(moneyAmount) > data.account.balance) setMoneyAmount(Math.min(moneyAmount, data.account.balance));

    return (
        <div>
            <button onClick={() => setPopupVisible(true)} className="body-row highlight-blue"><span className="material-symbols-rounded">download</span>Send money</button>
            <Popup visible={popupVisible}>
                <h2 style={{ opacity: 0.5, marginTop: "8px" }}>Transfer money</h2>
                <div className="body-row" style={{ gap: "10px" }}><h1 className="body-row" style={{ gap: "10px", margin: 0 }}><span className="material-symbols-rounded">east</span>{props.account.name}</h1><h1 style={{ margin: 0 }} className="subtext">{props.account.id}</h1></div>

                <h2 style={{ opacity: 0.5 }}>Source account</h2>
                <SourceAccountSelection default={props.default} onChange={setSourceAccountId} />

                <h2 style={{ opacity: 0.5 }}>Amount to transfer</h2>
                <div className="body-row" style={{ gap: "10px" }}>
                    <input value={moneyAmount} onChange={e => setMoneyAmount(e.target.value === "" ? "" : Math.max(parseInt(e.target.value, "10"), 0))} min="0" type="number" style={{ background: "none", width: "100px" }} placeholder="0" />
                    <label>SR</label>
                </div>

                <h2 style={{ opacity: 0.5, marginBottom: 0 }}>Review</h2>

                <div className="body-row" style={{ gap: "10px", marginTop: "16px", marginBottom: "8px" }}><h2 className="body-row" style={{ gap: "10px", margin: 0 }}><span style={{ color: "var(--highlight-green-color)" }} className="material-symbols-rounded">download</span>{props.account.name}</h2><h2 style={{ margin: 0 }} className="subtext">{props.account.id}</h2></div>
                <div className="body-row" style={{ gap: "10px", marginBottom: "8px" }}>
                    <h3 style={{ opacity: 0.5, marginTop: 0, marginBottom: 0 }}>Owner</h3>
                    {props.account.owner.avatar ? <DiscordAvatarPicture size="24" name={props.account.owner.display_name} id={props.account.owner.discord_id} avatar={props.account.owner.avatar} /> : <img src={props.account.owner.display_image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" />}
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>{props.account.type === 0 ? `${props.account.owner.display_name ?? `#${props.account.owner.discord_id}`}` : props.account.owner.name}</h3>
                </div>
                <div className="body-row" style={{ gap: "10px" }}>
                    <h3 style={{ opacity: 0.5, marginTop: "2px", marginBottom: "8px" }}>Balance</h3>
                    <h3 style={{ opacity: 0.5, marginTop: "2px", marginBottom: "8px" }}>{props.account.balance.toLocaleString()} SR</h3>
                    <span className="material-symbols-rounded" style={{ marginTop: "-3px" }}>east</span>
                    <h3 style={{ marginTop: "2px", marginBottom: "8px" }}>{(props.account.balance + Number(moneyAmount)).toLocaleString()} SR</h3>
                </div>

                {loading ? <div className="body-row" style={{ height: "110px", justifyContent: "center" }}><div className="loading-icon" style={{ width: "36px", height: "36px" }} /></div> : error ? <ErrorMessage title="Error" message={error.message} /> : data.account ? <div style={{ opacity: Boolean(data?.account?.current_user.p_use) ? null : 0.3 }}>
                    <div className="body-row" style={{ gap: "10px", marginTop: "16px", marginBottom: "8px" }}><h2 className="body-row" style={{ gap: "10px", margin: 0 }}><span style={{ color: "var(--highlight-red-color)" }} className="material-symbols-rounded">upload</span>{data.account.name}</h2><h2 style={{ margin: 0 }} className="subtext">{data.account.id}</h2></div>
                    <div className="body-row" style={{ gap: "10px", marginBottom: "8px" }}>
                        <h3 style={{ opacity: 0.5, marginTop: 0, marginBottom: 0 }}>Owner</h3>
                        {data.account.owner.avatar ? <DiscordAvatarPicture size="24" name={data.account.owner.display_name} id={data.account.owner.id} avatar={data.account.owner.avatar} /> : <img src={data.account.owner.display_image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" />}
                        <h3 style={{ marginTop: 0, marginBottom: 0 }}>{data.account.owner.name ?? `${data.account.owner.display_name ?? `#${data.account.owner.id}`}`}</h3>
                    </div>
                    <div className="body-row" style={{ gap: "10px" }}>
                        <h3 style={{ opacity: 0.5, marginTop: "2px", marginBottom: "8px" }}>Balance</h3>
                        <h3 style={{ opacity: 0.5, marginTop: "2px", marginBottom: "8px" }}>{data.account.balance.toLocaleString()} SR</h3>
                        <span className="material-symbols-rounded" style={{ marginTop: "-3px" }}>east</span>
                        <h3 style={{ marginTop: "2px", marginBottom: "8px" }}>{(data.account.balance - Number(moneyAmount)).toLocaleString()} SR</h3>
                    </div>
                </div> : <ErrorMessage title="Not available" message={`Account ${sourceAccountId} does not exist`} />}

                <br />

                <div className="body-row" style={{ gap: "10px" }}>
                    <button disabled={Number(moneyAmount) === 0 || !Boolean(data?.account?.current_user.p_use)} onClick={() => {
                        setPopupVisible(false);
                        setWorking(true);
                        core.fetch("GET", `/api/account/transfer?source=${sourceAccountId}&amount=${moneyAmount}&target=${props.account.id}`).then(response => {
                            setWorking(false);
                            if (response.ok) {
                                data.account.balance = Number(response.response.source_new_balance);
                                props.account.balance = Number(response.response.target_new_balance);
                                props.onChange();
                                setSuccessPopupVisible(true);
                            }
                        });
                    }} className="highlight-blue">Transfer</button>
                    <button onClick={() => setPopupVisible(false)}>Cancel</button>
                </div>

                <br />
            </Popup>
            <Popup visible={working}>
                <p style={{ textAlign: "center", opacity: 0.5 }}>Please wait</p>
                <div class="loading-icon" style={{ marginLeft: "auto", marginRight: "auto", height: "32px", width: "32px" }} />
                <br />
            </Popup>
            <Popup visible={successPopupVisible}>
                <h2 style={{ opacity: 0.5, marginTop: "8px" }}>Transfer successful</h2>

                <div className="body-row" style={{ gap: "10px", marginTop: "16px", marginBottom: "8px" }}><h2 className="body-row" style={{ gap: "10px", margin: 0 }}><span style={{ color: "var(--highlight-green-color)" }} className="material-symbols-rounded">download</span>{props.account.name}</h2><h2 style={{ margin: 0 }} className="subtext">{props.account.id}</h2></div>
                <div className="body-row" style={{ gap: "10px", marginBottom: "8px" }}>
                    <h3 style={{ opacity: 0.5, marginTop: 0, marginBottom: 0 }}>Owner</h3>
                    {props.account.owner.avatar ? <DiscordAvatarPicture size="24" name={props.account.owner.display_name} id={props.account.owner.discord_id} avatar={props.account.owner.avatar} /> : <img src={props.account.owner.display_image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" />}
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>{props.account.type === 0 ? (props.account.owner.display_name ?? `#${props.account.owner.id}`) : props.account.owner.name}</h3>
                </div>
                <div className="body-row" style={{ gap: "10px" }}>
                    <h3 style={{ opacity: 0.5, marginTop: "2px", marginBottom: "8px" }}>Balance</h3>
                    <h3 style={{ marginTop: "2px", marginBottom: "8px" }}>{props.account.balance.toLocaleString()} SR</h3>
                </div>

                {data?.account ? <div>
                    <div className="body-row" style={{ gap: "10px", marginTop: "16px", marginBottom: "8px" }}><h2 className="body-row" style={{ gap: "10px", margin: 0 }}><span style={{ color: "var(--highlight-red-color)" }} className="material-symbols-rounded">upload</span>{data.account.name}</h2><h2 style={{ margin: 0 }} className="subtext">{data.account.id}</h2></div>
                    <div className="body-row" style={{ gap: "10px", marginBottom: "8px" }}>
                        <h3 style={{ opacity: 0.5, marginTop: 0, marginBottom: 0 }}>Owner</h3>
                        {data.account.owner.avatar ? <DiscordAvatarPicture size="24" name={data.account.owner.display_name} id={data.account.owner.id} avatar={data.account.owner.avatar} /> : <img src={data.account.owner.display_image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" />}
                        <h3 style={{ marginTop: 0, marginBottom: 0 }}>{data.account.owner.name ?? (data.account.owner.display_name ?? `#${data.account.owner.id}`)}</h3>
                    </div>
                    <div className="body-row" style={{ gap: "10px" }}>
                        <h3 style={{ opacity: 0.5, marginTop: "2px", marginBottom: "8px" }}>Balance</h3>
                        <h3 style={{ marginTop: "2px", marginBottom: "8px" }}>{data.account.balance.toLocaleString()} SR</h3>
                    </div>
                </div> : null}

                <br />

                <div className="body-row" style={{ gap: "10px" }}>
                    <button onClick={() => setSuccessPopupVisible(false)}>OK</button>
                </div>

                <br />
            </Popup>
        </div>
    )
}

function Main({ accountId }) {
    const query = gql`
        query Account($id: Int!) {
            account(id: $id) {
                id
                name
                type
                balance
                history {
                    time
                    data
                }
                ...on PersonalAccount {
                    owner {
                        discord_id: id
                        display_name
                        user_color: color
                        avatar
                    }
                }
                ...on FactionAccount {
                    owner {
                        id
                        name
                        color
                        display_image
                    }
                }
                ...on NationAccount {
                    owner {
                        id
                        name
                        color
                        display_image
                    }
                }
                current_user {
                    p_use
                    p_delete
                    p_rename
                }
            }
        }
    `;

    const { loading, error, data, refetch } = useQuery(query, { variables: { id: accountId } });

    if (loading) return <div style={{ display: "flex", height: "80vh", alignItems: "center", justifyContent: "center" }}><div className="loading-icon" style={{ width: "48px", height: "48px" }} /></div>;
    if (error) return <ErrorMessage title="Error" message={error.message} />;

    if (!data.account) return <ErrorMessage title="Not available" message={`Account ${accountId} does not exist.`} />;

    document.title = `StormLands | ${data.account.name}`;

    const isPrimaryAccount = core.userData.primary_account_id === data.account.id;
    const color = data.account.owner.user_color ?? data.account.owner.color;

    return (
        <div className="app">
            <Sidebar type={data.account.type} id={data.account.type === 0 ? data.account.owner.discord_id : data.account.owner.id} />
            <div className="body" style={{ background: color ? `radial-gradient(800% 130% at 650% -50%, #${core.colorBase10toHex(color)}, transparent)` : null }}>
                <div className="body-inner" style={{ gap: "15px" }}>
                    <div className="body-row" style={{ gap: "20px" }}>
                        {isPrimaryAccount ? <h1 style={{ fontSize: "3em" }}>⭐</h1> : null}
                        <h1 style={{ fontSize: "3em", userSelect: "all" }} className="subtext">{data.account.id}</h1>
                        <h1 style={{ fontSize: "3em" }}>{data.account.name}</h1>
                    </div>

                    <Link to={`/ash/${data.account.type === 0 ? "user" : data.account.type === 1 ? "faction" : "nation"}/${data.account.type === 0 ? data.account.owner.discord_id : data.account.owner.id}`} className="body-row" style={{ gap: "15px", color: "var(--text-color)" }}>
                        {data.account.type === 0 ? <DiscordAvatarPicture size="48" name={data.account.owner.display_name} id={data.account.owner.discord_id} avatar={data.account.owner.avatar} /> : <img src={data.account.owner.display_image} height="48" width="48" style={{ borderRadius: "var(--control-border-radius)" }} />}
                        <h2>{data.account.type === 0 ? (data.account.owner.display_name ?? `#${data.account.owner.discord_id}`) : data.account.owner.name}</h2>
                        <h2 className="subtext">{data.account.type === 0 ? "User" : data.account.type === 1 ? "Faction" : "Nation"}</h2>
                    </Link>

                    <div className="body-row">
                        <span className={`chip highlight-${data.account.type === 0 ? "yellow" : data.account.type === 1 ? "blue" : "green"}`}>{data.account.type === 0 ? "Personal account" : data.account.type === 1 ? "Faction account" : "Nation account"}</span>
                        {isPrimaryAccount ? <span className="chip highlight-yellow">Primary account</span> : null}
                        {data.account.owner.id === 0 ? <span className="chip highlight-red">System account</span> : null}
                    </div>

                    <div className="body-row">
                        <TransferMoney onChange={refetch} default={core.userData.primary_account_id} account={data.account} />
                        {data.account.current_user.p_use ? <button className="body-row" disabled={data.account.balance < 1}><span className="material-symbols-rounded">upload</span>Withdraw</button> : null}
                        {(data.account.current_user.p_delete && !isPrimaryAccount) ? <button className="body-row"><span className="material-symbols-rounded">delete</span>Delete</button> : null}
                    </div>

                    <h1 style={{ opacity: 0.5, marginBottom: 0 }}>Balance</h1>
                    <h1 style={{ fontSize: "3em", marginTop: 0 }}>{data.account.balance.toLocaleString()} SR</h1>

                    <h1 style={{ opacity: 0.5, marginBottom: 0 }}>Users</h1>
                    <UsersSection account={data.account} />

                    <h1 style={{ opacity: 0.5, marginBottom: 0 }}>History<span className="chip highlight-green" style={{ marginLeft: "10px" }}>WIP</span></h1>
                    {data.account.history ? <table>
                        <tr>
                            <th>Time</th>
                            <th>Entry</th>
                        </tr>
                        {data.account.history.map(entry => <tr><td>{new Date(entry.time * 1000).toLocaleString()}</td><td>{entry.data}</td></tr>)}
                    </table> : <p>Restricted</p>}
                </div>
            </div>
        </div>
    );
}

export default function Account() {
    const str = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
    const accountId = Number(str);
    if (str === "" || isNaN(accountId)) return <ErrorMessage title="Not available" />;
    return <Main accountId={accountId} />;
}