const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createToken, publicUser, requiredText, validateEmail, validatePassword, httpError } = require('../utils/validation');

class AuthController {
    constructor() {
        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
        this.getCurrentUser = this.getCurrentUser.bind(this);
    }

    async register(req, res) {
        const name = requiredText(req.body.name, 'Name', 100);
        const email = validateEmail(req.body.email);
        const password = req.body.password;
        validatePassword(password);

        const user = await User.create({ name, email, passwordHash: password });
        res.status(201).json({ token: createToken(user), user: publicUser(user) });
    }

    async login(req, res) {
        const email = validateEmail(req.body.email);
        const password = req.body.password;
        if (typeof password !== 'string' || !password) {
            throw httpError(400, 'Email and password are required.');
        }

        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw httpError(401, 'Email or password is incorrect.');
        }
        res.json({ token: createToken(user), user: publicUser(user) });
    }

    getCurrentUser(req, res) {
        res.json({ user: publicUser(req.user) });
    }
}

module.exports = AuthController;
