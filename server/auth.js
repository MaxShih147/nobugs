import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { findMemberByEmail, getMemberMappings } from './members.js';

const JWT_EXPIRY = '8h';
const COOKIE_NAME = 'nobugs_token';

export function isAuthEnabled() {
  return !!(process.env.INVITE_CODE && process.env.JWT_SECRET);
}

function getAllowedEmails() {
  const raw = process.env.ALLOWED_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function isEmailAllowed(email) {
  const allowed = getAllowedEmails();
  if (allowed.length > 0) return allowed.includes(email?.toLowerCase());

  // No ALLOWED_EMAILS set — use admin email + member mappings as allowlist
  const adminEmail = getAdminEmail();
  if (adminEmail && email?.toLowerCase() === adminEmail) return true;

  const { mappings } = getMemberMappings();
  if (mappings.length === 0) return true; // no restrictions yet
  return mappings.some((m) => m.email && m.email.toLowerCase() === email?.toLowerCase());
}

function getAdminEmail() {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL.trim().toLowerCase();
  const allowed = getAllowedEmails();
  return allowed.length > 0 ? allowed[0] : null;
}

export function isAdmin(email) {
  const admin = getAdminEmail();
  if (!admin) return false;
  return email?.toLowerCase() === admin;
}

export function requireAdmin(req, res, next) {
  if (!isAuthEnabled()) return next();
  if (req.user && isAdmin(req.user.email)) return next();
  return res.status(403).json({ error: 'Admin access required' });
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function createAuthRouter() {
  const router = Router();

  // Login with email + invite code
  router.post('/login', (req, res) => {
    if (!isAuthEnabled()) {
      return res.status(400).json({ error: 'Auth not configured' });
    }

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and invite code are required' });
    }

    if (code !== process.env.INVITE_CODE) {
      return res.status(401).json({ error: 'Invalid invite code' });
    }

    if (!isEmailAllowed(email)) {
      return res.status(403).json({ error: 'Email not on the allowed list' });
    }

    const user = { email: email.toLowerCase() };
    const token = signToken(user);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    });

    user.isAdmin = isAdmin(user.email);
    user.memberName = findMemberByEmail(user.email);
    res.json({ ok: true, user });
  });

  // Check current auth status (always 200)
  router.get('/me', (req, res) => {
    if (!isAuthEnabled()) {
      return res.json({ authenticated: false, authEnabled: false });
    }

    const token = req.cookies?.[COOKIE_NAME];
    const user = token ? verifyToken(token) : null;

    if (user) {
      const { iat, exp, ...userData } = user;
      userData.isAdmin = isAdmin(userData.email);
      userData.memberName = findMemberByEmail(userData.email);
      return res.json({ authenticated: true, authEnabled: true, user: userData });
    }
    res.json({ authenticated: false, authEnabled: true });
  });

  // Logout
  router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  });

  return router;
}

export function requireAuth(req, res, next) {
  if (!isAuthEnabled()) return next();

  const token = req.cookies?.[COOKIE_NAME];
  const user = token ? verifyToken(token) : null;

  if (user) {
    req.user = user;
    return next();
  }

  return res.status(401).json({ error: 'Not authenticated' });
}
