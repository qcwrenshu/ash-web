export default function Link(props) {
    return <a href={props.to} onClick={e => { if (!props.to) return; if (props.onClick) props.onClick(e); if (window.location.pathname.startsWith("/ash")) { e.preventDefault(); history.pushState({}, "", props.to); dispatchEvent(new Event("popstate")); } }} className={props.className} style={props.style}>{props.children}</a>
}