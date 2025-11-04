/*
Ash Web
@qcwrenshu

Error message to be displayed anywhere in the application.

*/

export default function ErrorMessage(props) {
    return (
        <div className="highlight-red" style={{ padding: "20px 30px" }}>
            <h1 style={{ marginTop: 0, marginBottom: "12px" }}>{props.title}</h1>
            {props.title === "Error" ? <div>
                <p>{props.message}</p>
                <p style={{ marginBottom: 0 }}>{props.message.includes("429") ? "429: You are being rate-limited. Send fewer requests. " : ""}Please reload the page or contact developer</p>
            </div> : <p style={{ marginBottom: 0 }}>{props.message}</p>}
        </div>
    );
}