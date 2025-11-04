/*
Ash Web
@qcwrenshu

navbar-manager.js provides login/logout and search functionality.
Search is done through a REST API and not GraphQL (obviously).

The search bar only appears if the user is logged in. It would not function otherwise.

*/

import { useState } from "react";
import { createRoot } from "react-dom/client";

import Link from "./components/Link.js";
import DiscordAvatarPicture from "./components/DiscordAvatarPicture.js";

const searchCache = new Map();
function SearchBar() {
    const [text, setText] = useState("");

    const [dataText, setDataText] = useState("");
    const [data, setData] = useState();

    const [loading, setLoading] = useState(0);

    if (!data && text === "") core.fetch("GET", "/api/search").then(response => { setData(response); searchCache.set("", response); });

    function update(value) {
        setText(value);
        const text = value.trim();
        if (searchCache.has(text)) {
            setData(searchCache.get(text));
        } else {
            setLoading(state => state + 1);
            core.fetch("GET", `/api/search?q=${text}`).then(response => {
                if (dataText !== text) {
                    setData(response);
                    setDataText(text);
                }
                if (response.ok) searchCache.set(text, response);
                setLoading(state => state - 1);
            });
        }
    }

    return (
        <div id="search-container">
            <input value={text} onChange={e => update(e.target.value)} type="text" placeholder="Search" style={{ width: "400px" }} />
            {data?.response ?
                <div className="search-dropdown" style={{ width: "400px" }}>
                    {data.ok && data.response.length > 0 ?
                        data.response.map(obj =>
                            <Link onClick={() => { document.activeElement.blur(); update(""); }} className="panel-section-item" key={obj.link} to={obj.link}>
                                {obj.image ? <img src={obj.image} style={{ borderRadius: "var(--control-border-radius)" }} width="24px" height="24px" /> : null}
                                <span className="panel-section-item-main" dangerouslySetInnerHTML={{ __html: obj.title }} />
                                <span className="subtext">{obj.subtext}</span>
                                <span style={{ marginLeft: "auto" }}>{isNaN(obj.balance) ? null : `${obj.balance.toLocaleString()} SR`}</span>
                            </Link>
                        )
                        : <p style={{ textAlign: "center", opacity: 0.5 }}>No results</p>
                    }
                </div>
                : null}
            {loading > 0 ? <div className="loading-icon" style={{ width: "16px", height: "16px", position: "absolute", marginTop: "-22px", marginLeft: "376px" }} /> : null}
        </div>
    );
}

const navbar = createRoot(document.getElementById("navbar"));

navbar.render(
    <div>
        <a id="navbar-logo" href="/"><img src="/assets/logo_full.png" alt="StormLands" title="StormLands" height="32" /></a>
        <div className="navbar-align-left">
            <span className="chip highlight-green" style={{ padding: "3px 5px", marginLeft: "20px" }}>BETA</span>
            <Link to="/ash" style={{ whiteSpace: "nowrap" }}>Ash Web Console</Link>
            {core.userData ? <SearchBar /> : null}
        </div>
        {core.userData ?
            <div className="navbar-align-right">
                <DiscordAvatarPicture size="32" name={core.userData.display_name} id={core.userData.id} avatar={core.userData.avatar} />
                <span className="navbar-dropdown-container" tabIndex="0" style={{ cursor: "pointer" }}>
                    <div className="navbar-dropdown">
                        <a href="/logout" onClick={() => localStorage.removeItem("user_data")}>Sign out</a>
                    </div>
                    Welcome, <b>{core.userData.display_name}</b>
                </span>
            </div> :
            <div className="navbar-align-right">
                <a href="/login/discord">Log in with Discord</a>
            </div>
        }
    </div>
);