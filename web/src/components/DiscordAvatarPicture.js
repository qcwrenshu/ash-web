/*
Ash Web
@qcwrenshu

Displays a Discord user's avatar picture at proper size based on the device resolution (for the sake of data usage).

*/

export default function DiscordAvatarPicture(props) {
    const size = (() => { let n = (devicePixelRatio * props.size) - 1; while ((n & n - 1) !== 0) n = n & n - 1; return Math.min(Math.max(n << 1, 16), 4096); })();
    return (
        <picture style={{ height: `${props.size}px` }}>
            <source srcSet={`https://cdn.discordapp.com/avatars/${props.id}/${props.avatar}.webp?size=${size}`} type="image/webp" />
            <img style={{ borderRadius: "100%" }} height={props.size} title={props.name} alt={props.name} src={`https://cdn.discordapp.com/avatars/${props.id}/${props.avatar}.png?size=${size}`} />
        </picture>
    );
}