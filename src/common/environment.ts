declare global {
    interface Window {
        env: any;
    }
}

window.env = {
    REACT_APP_API_URL: "REACT_APP_API_URL_PLACEHOLDER",
    NODE_ENV: "NODE_ENV_PLACEHOLDER"
};

export class Env {
    public static get() {
        return window.env.NODE_ENV;
    }
    public static getApiUrl() {
        return window.env.REACT_APP_API_URL;
    }
}
