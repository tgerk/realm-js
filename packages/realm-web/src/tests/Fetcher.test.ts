////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { expect } from "chai";
import { App } from "../App";

import { Fetcher } from "../Fetcher";
import { User } from "../User";

import { MockNetworkTransport, SENDING_JSON_HEADERS, ACCEPT_JSON_HEADERS } from "./utils";

describe("Fetcher", () => {
  it("constructs", () => {
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport: new MockNetworkTransport(),
      userContext: { currentUser: null },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
    });
    expect(typeof fetcher.fetch).equals("function");
  });

  it("sends access token when requesting", async () => {
    const transport = new MockNetworkTransport([{ foo: "bar" }]);
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport,
      userContext: {
        currentUser: { accessToken: "my-access-token" } as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
    });
    // Send a request
    const response = await fetcher.fetchJSON({
      method: "POST",
      url: "http://localhost:1337/w00t",
      body: { something: "interesting" },
      headers: { Cookie: "yes-please" },
    });
    // Expect something of the request and response
    expect(transport.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/w00t",
        body: { something: "interesting" },
        headers: {
          ...SENDING_JSON_HEADERS,
          Cookie: "yes-please",
          Authorization: "Bearer my-access-token",
        },
      },
    ]);
    expect(response).deep.equals({ foo: "bar" });
  });

  it("allows overwriting headers", async () => {
    const transport = new MockNetworkTransport([{}]);
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport,
      userContext: {
        currentUser: { accessToken: "my-access-token" } as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
    });
    // Send a request
    await fetcher.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
      headers: {
        Authorization: "Bearer my-custom-token",
      },
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-custom-token",
        },
      },
    ]);
  });

  it("allows user-scope context", async () => {
    const transport = new MockNetworkTransport([{}]);
    const currentUser: unknown = {
      accessToken: "my-access-token",
      userRequestHeaders: { ["X-Custom-Header"]: "user-header-value" },
    };
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport,
      userContext: {
        currentUser: currentUser as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
    });
    // Send a request
    await fetcher.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-access-token",
          ["X-Custom-Header"]: "user-header-value",
        },
      },
    ]);
  });

  it("allows app-scope context", async () => {
    const transport = new MockNetworkTransport([{}]);
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport,
      userContext: {
        currentUser: { accessToken: "my-access-token" } as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
      // expect this to normally pass-through from App constructor option, else this test is precisely the same as next following
      requestHeaders: { ["X-Custom-Header"]: "app-header-value" },
    });
    // Send a request
    await fetcher.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-access-token",
          ["X-Custom-Header"]: "app-header-value",
        },
      },
    ]);
  });

  it("allows constructor-defined context", async () => {
    const transport = new MockNetworkTransport([{}]);
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport,
      userContext: {
        currentUser: { accessToken: "my-access-token" } as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
      requestHeaders: { ["X-Custom-Header"]: "ctor-header-value" },
    });
    // Send a request
    await fetcher.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-access-token",
          ["X-Custom-Header"]: "ctor-header-value",
        },
      },
    ]);
  });

  it("allows context as clone option", async () => {
    const transport = new MockNetworkTransport([{}]);
    const fetcher = new Fetcher({
        appId: "test-app-id",
        transport,
        userContext: {
          currentUser: { accessToken: "my-access-token" } as User,
        },
        locationUrlContext: {
          locationUrl: Promise.resolve("http://localhost:1337"),
        },
        requestHeaders: { ["X-Custom-Header"]: "ctor-header-value" },
      }),
      fetcher2 = fetcher.clone({
        requestHeaders: {
          ["X-Custom-Header"]: "ctor-header-value-override",
          ["X-Custom-Header2"]: "clone-header-value",
        },
      });
    // Send a request
    await fetcher2.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-access-token",
          ["X-Custom-Header"]: "ctor-header-value-override",
          ["X-Custom-Header2"]: "clone-header-value",
        },
      },
    ]);
  });

  it("gets context through App constructor option", async () => {
    const transport = new MockNetworkTransport([{}]);
    const app = new App({
      id: "test-app-id",
      baseUrl: "http://localhost:1337",
      transport,
      requestHeaders: {
        ["X-Custom-Header"]: "app-header-value",
        ["X-Custom-Clobber-Header"]: "app-clobbered-value",
      },
    });
    // Send a request
    await app.fetcher.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
      headers: {
        ["X-Custom-Clobber-Header"]: "request-clobbering-value",
        ["X-Custom-Request-Header"]: "request-header-value"
      }
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          ["X-Custom-Header"]: "app-header-value",
          ["X-Custom-Clobber-Header"]: "request-clobbering-value",
          ["X-Custom-Request-Header"]: "request-header-value"
        },
      },
    ]);
  });

  it("applies context headers with precedence: ctor < user < request", async () => {
    const transport = new MockNetworkTransport([{}]);
    const currentUser: unknown = {
      accessToken: "my-access-token",
      userRequestHeaders: {
        ["X-Custom-Header"]: "user-header-value",
        ["X-Custom-Header2"]: "user-header2-value",
        ["X-Custom-Header3"]: "user-header2-value",
      },
    };
    const fetcher = new Fetcher({
      appId: "test-app-id",
      transport,
      userContext: {
        currentUser: currentUser as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
      requestHeaders: {
        ["X-Custom-App"]: "app-header-value",
        ["X-Custom-Header2"]: "ctor-header-value"
      },
    });
    // Send a request
    await fetcher.fetchJSON({
      method: "GET",
      url: "http://localhost:1337/w00t",
      // there's no TS restriction on shape of this, could be : [string, string][], Map<string,string>, or { [name: string], value: string }
      headers: {
        ["X-Custom-Header3"]: "request-header-value"
      }
    });
    // Expect something of the request
    expect(transport.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-access-token",
          ["X-Custom-App"]: "app-header-value",  // passes through from Fetch constructor option
          ["X-Custom-Header"]: "user-header-value",  // passes through from User property
          ["X-Custom-Header2"]: "user-header2-value",  // clobbers Fetch's second custom header
          ["X-Custom-Header3"]: "request-header-value",  // clobbers User's third custom header
        },
      },
    ]);
  });
});
