import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import * as auth from "../auth/AuthContext";
import LoginPage from "./LoginPage";

function setup(login: () => Promise<void>, register = vi.fn()) {
  vi.spyOn(auth, "useAuth").mockReturnValue({ user: null, loading: false, login, register, logout: vi.fn() });
  render(<LoginPage />);
}

describe("LoginPage", () => {
  it("submits the entered credentials", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    setup(login);
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "supersecret123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(login).toHaveBeenCalledWith("me@example.com", "supersecret123");
  });

  it("shows the server's error message", async () => {
    setup(vi.fn().mockRejectedValue(new ApiError(401, "Incorrect email or password.")));
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("switches to sign-up and calls register", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    setup(vi.fn(), register);
    await userEvent.click(screen.getByRole("button", { name: "Need an account?" }));
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "supersecret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() => expect(register).toHaveBeenCalledWith("new@example.com", "supersecret123"));
  });
});
