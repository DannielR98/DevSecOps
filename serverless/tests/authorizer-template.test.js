import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

describe("API authorizer configuration", () => {
  it("protects HTTP routes by default and leaves only login and registration public", () => {
    const document = parseDocument(readFileSync("template.yaml", "utf8"));
    expect(document.errors).toEqual([]);
    const resources = document.toJS().Resources;
    const auth = resources.HttpApi.Properties.Auth;
    expect(auth.DefaultAuthorizer).toBe("TokenAuthorizer");
    expect(auth.Authorizers.TokenAuthorizer).toMatchObject({
      AuthorizerPayloadFormatVersion: "2.0",
      EnableSimpleResponses: true,
      EnableFunctionDefaultPermissions: true,
      Identity: { Headers: ["Authorization"], ReauthorizeEvery: 0 },
    });
    expect(resources.TokenAuthorizerFunction.Properties.Handler).toBe("authorize.handler");

    const routes = Object.values(resources).flatMap((resource) =>
      Object.values(resource.Properties?.Events ?? {})
        .filter((event) => event.Type === "HttpApi")
        .map((event) => event.Properties),
    );
    const publicRoutes = routes.filter((route) => route.Auth?.Authorizer === "NONE");
    expect(routes.filter((route) => route.Method === "POST" && route.Path === "/api/groups/join")).toHaveLength(1);
    expect(routes.some((route) => route.Path === "/api/group-members/join")).toBe(false);
    expect(resources.JoinGroupMemberFunction).toBeUndefined();
    expect(publicRoutes.map((route) => `${route.Method} ${route.Path}`).sort())
      .toEqual(["POST /api/login", "POST /api/register"]);
    for (const route of routes.filter((route) => !publicRoutes.includes(route))) {
      expect(route.Auth?.Authorizer).toBeUndefined();
    }
  });
});
