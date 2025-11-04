/*
Ash Web
@qcwrenshu

Popup takes over the screen and blurs the content behind it.

TODO: Escape key should close the popup, and this should be handled in the component.
Currently this is handled by the parent component (i.e. account.js)

*/

import { useState } from "react";

export default function Popup(props) {
    const [animateState, setAnimateState] = useState(false);
    const [displayTimeout, setDisplayTimeout] = useState(null);

    if (props.visible && displayTimeout !== 0) {
        clearTimeout(displayTimeout);
        setDisplayTimeout(0);
        requestAnimationFrame(() => setAnimateState(true));
    }
    if (!props.visible && animateState) {
        setAnimateState(false);
        setDisplayTimeout(setTimeout(() => setDisplayTimeout(null), 200));
    }

    return (
        <div className="transition" style={{
            background: "var(--popup-blocking-background)",
            backdropFilter: "blur(10px)",
            position: "fixed",
            width: "100%",
            height: "100%",
            left: 0,
            top: 0,
            zIndex: 1000,
            display: displayTimeout === null ? "none" : "flex",
            pointerEvents: props.visible ? "auto" : "none",
            alignItems: "center",
            justifyContent: "center",
            opacity: animateState ? 1 : 0
        }} tabIndex={props.visible ? undefined : "-1"}>
            <div className="transition" style={{
                minWidth: "500px",
                borderRadius: "var(--control-border-radius-alt)",
                background: "var(--popup-background)",
                border: "1px solid var(--popup-border)",
                backdropFilter: "blur(10px)",
                boxShadow: "var(--popup-box-shadow)",
                overflow: "auto",
                maxHeight: "85vh",
                padding: "10px 20px",
                transform: animateState ? "none" : "scale(0.9)"
            }} tabIndex={props.visible ? undefined : "-1"}>
                {props.children}
            </div>
        </div>
    );
}