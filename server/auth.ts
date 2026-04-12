import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express } from "express";
import { storage } from "./storage";
import { type User as SelectUser } from "@shared/schema";
import crypto from "crypto";
import MemoryStore from "memorystore";

const sessionMemoryStore = MemoryStore(session);

function hashPassword(password: string) {
    return crypto.scryptSync(password, "salt", 64).toString("hex");
}

function comparePasswords(supplied: string, stored: string) {
    const hashed = hashPassword(supplied);
    return crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(stored));
}

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "development-secret",
        resave: false,
        saveUninitialized: false,
        store: new sessionMemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
        }),
        cookie: {
            secure: app.get("env") === "production",
        },
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                const user = await storage.getUserByEmail(email);
                if (!user || !user.password || !comparePasswords(password, user.password)) {
                    return done(null, false, { message: "Invalid email or password" });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as SelectUser).id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post("/api/register", async (req, res, next) => {
        try {
            const existingUser = await storage.getUserByEmail(req.body.email);
            if (existingUser) {
                return res.status(400).send("User already exists");
            }

            const user = await storage.createUser({
                ...req.body,
                password: hashPassword(req.body.password),
            });

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.get("/api/login", (req, res) => {
        res.redirect("/auth");
    });

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).json(info);
            req.login(user, (err) => {
                if (err) return next(err);
                res.json(user);
            });
        })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/user/me", (req, res) => {
        if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
        res.json(req.user);
    });
}
