/*
Ash Web
@qcwrenshu

The footer links to the privacy policy.

*/

export default function AshFooter(props) {
    return (
        <div className="panel-section-item" style={{ opacity: 0.3, filter: "grayscale(1)", marginTop: props.anchorBottom ? "auto" : null }}>
            <img src="https://cdn.discordapp.com/avatars/761358247373438997/6d5668707a08fff7fd4e8324fc5cb9d2.png?size=32" width="24px" height="24px" style={{ borderRadius: "var(--control-border-radius)" }} />
            <label className="panel-section-item-main">Ash Online Services</label>
            <label class="panel-section-item-main" style={{ fontWeight: "normal" }}>{props.text}</label>
            <a href="/" style={{ marginLeft: "auto", color: "var(--text-color)" }}>Privacy policy</a>
        </div>
    );
}