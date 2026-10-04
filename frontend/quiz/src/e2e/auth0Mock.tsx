import type { PropsWithChildren } from "react";

const testUser = {
    sub: "auth0|bdd-test-user",
    email: "bdd@example.test",
    name: "BDD Test User",
    nickname: "bdd-user",
};

const getAccessTokenSilently = async () => "bdd-test-token";

export function Auth0Provider({ children }: PropsWithChildren) {
    return <>{children}</>;
}

export function useAuth0() {
    return {
        isAuthenticated: true,
        isLoading: false,
        user: testUser,
        getAccessTokenSilently,
        loginWithRedirect: async () => undefined,
        logout: () => undefined,
    };
}