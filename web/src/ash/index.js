/*
Ash Web
@qcwrenshu

index.js builds the application.
It also services the error page.

Note the use of Apollo for GraphQL. Most of Ash Web uses GraphQL instead of a REST API for fetching information, as the underlying data structures are very suited to it.

*/

import { createRoot } from "react-dom/client";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

const client = new ApolloClient({
    uri: "/api/graphql",
    cache: new InMemoryCache(),
});

import Home from "./home.js";
import Account from "./account.js";
import CreateVehicle from "./createvehicle.js";

function ErrorPage() {
    document.title = "StormLands | 404";
    return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "80vh" }}>
            <h1 style={{ fontSize: "130px" }}>404</h1>
            <h1>The requested resource was not found.</h1>
            <p>Check yourself before you wreck yourself.</p>
        </div>
    );
}

function App() {
    const pathNames = window.location.pathname.substring(1).split("/");
    pathNames.shift();

    switch (pathNames.shift()) {
        case undefined: case "": {
            return <Home />;
        }
        case "account": {
            return <Account />;
        }
        case "createvehicle": {
            return <CreateVehicle />;
        }
        default: {
            return <ErrorPage />;
        }
    }
}

const app = createRoot(document.getElementById("app"));
function update() {
    app.render(
        <ApolloProvider client={client}>
            <App />
        </ApolloProvider>
    );
}
addEventListener("popstate", update);
update();