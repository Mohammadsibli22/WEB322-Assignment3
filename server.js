/********************************************************************************
* WEB322 – Assignment 03
* Name: Mohammadsibli Pathan  Student ID: 189933237  Date: 02/12/2025
********************************************************************************/

require('dotenv').config();

// ----------------------
// IMPORT DEPENDENCIES
// ----------------------
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const clientSessions = require('client-sessions');
const path = require('node:path');

const { mongoose, sequelize } = require('./modules/db');
const User = require('./models/User');
const Task = require('./models/Task');

// ----------------------
// EXPRESS APP
// ----------------------
const app = express();

// ----------------------
// VIEW ENGINE
// ----------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));   // ROOT VERSION

// ----------------------
// STATIC FILES
// ----------------------
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------
// MIDDLEWARE
// ----------------------
app.use(express.urlencoded({ extended: false }));
app.use(helmet());

app.use(clientSessions({
    cookieName: 'session',
    secret: process.env.SESSION_SECRET || 'default_secret',
    duration: Number.parseInt(process.env.SESSION_DURATION || '1800000'),
    activeDuration: 1000 * 60
}));

// Make user available in EJS
app.use((req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
});

// ----------------------
// LOGIN CHECK MIDDLEWARE
// ----------------------
function ensureLogin(req, res, next) {
    if (!req.session?.user) return res.redirect('/login');
    next();
}

// ----------------------
// ROUTES
// ----------------------
app.get('/', (req, res) => res.redirect('/register'));

app.get('/register', (req, res) => res.render('register', { errorMsg: '' }));

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
        return res.render('register', { errorMsg: 'All fields are required' });

    try {
        const exists = await User.findOne({ $or: [{ username }, { email }] });
        if (exists)
            return res.render('register', { errorMsg: 'Username or email already in use' });

        const hash = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hash });
        await newUser.save();

        res.render('message', { message: 'registration successful!' });
    } catch (err) {
        console.error(err);
        res.render('register', { errorMsg: 'Error registering user' });
    }
});

app.get('/login', (req, res) => res.render('login', { errorMsg: '' }));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.render('login', { errorMsg: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.render('login', { errorMsg: 'Invalid username or password' });

        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email
        };

        res.redirect('/dashboard');
    }
    catch (err) {
        console.error(err);
        res.render('login', { errorMsg: 'Login error' });
    }
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/login');
});

app.get('/dashboard', ensureLogin, (req, res) => {
    res.render('dashboard');
});

app.get('/tasks', ensureLogin, async (req, res) => {
    try {
        const tasks = await Task.findAll({
            where: { userId: req.session.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.render('tasks', { tasks });
    } catch (err) {
        console.error(err);
        res.render('message', { message: 'Error fetching tasks' });
    }
});

app.get('/tasks/add', ensureLogin, (req, res) => {
    res.render('addTask', { errorMsg: '' });
});

app.post('/tasks/add', ensureLogin, async (req, res) => {
    const { title, description, dueDate } = req.body;

    if (!title)
        return res.render('addTask', { errorMsg: 'Title is required' });

    try {
        await Task.create({
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null,
            userId: req.session.user.id
        });

        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.render('addTask', { errorMsg: 'Error creating task' });
    }
});

app.get('/tasks/edit/:id', ensureLogin, async (req, res) => {
    const task = await Task.findByPk(req.params.id);

    if (!task || task.userId !== req.session.user.id)
        return res.status(404).render('404');

    res.render('editTask', { task });
});

app.post('/tasks/edit/:id', ensureLogin, async (req, res) => {
    const { title, description, dueDate, status } = req.body;

    try {
        const task = await Task.findByPk(req.params.id);

        if (!task || task.userId !== req.session.user.id)
            return res.status(404).render('404');

        await task.update({
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null,
            status
        });

        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.render('message', { message: 'Error updating task' });
    }
});

app.post('/tasks/delete/:id', ensureLogin, async (req, res) => {
    const task = await Task.findByPk(req.params.id);

    if (!task || task.userId !== req.session.user.id)
        return res.status(404).render('404');

    await task.destroy();
    res.redirect('/tasks');
});

app.post('/tasks/status/:id', ensureLogin, async (req, res) => {
    const task = await Task.findByPk(req.params.id);

    if (!task || task.userId !== req.session.user.id)
        return res.status(404).render('404');

    await task.update({ status: req.body.status });
    res.redirect('/tasks');
});

// 404
app.use((req, res) => {
    res.status(404).render('404');
});

// EXPORT FOR VERCEL
module.exports = app;
