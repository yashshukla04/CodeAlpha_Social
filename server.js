const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { User, Post, Message } = require('./models/Schemas');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/public', express.static(path.join(__dirname, 'public')));

connectDB();

// --- 1. AUTH API ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const pic = `https://ui-avatars.com/api/?name=${username}&background=6c5ce7&color=fff`;
        const user = new User({ username, password, profilePic: pic });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Username taken" }); }
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username, password: req.body.password });
    if (user) res.json(user);
    else res.status(400).json({ error: "Invalid credentials" });
});

// --- 2. FEED & INTERACTIONS API ---
app.get('/api/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/api/posts', async (req, res) => {
    const user = await User.findById(req.body.userId);
    const post = new Post({ ...req.body, username: user.username, userPic: user.profilePic });
    await post.save();
    res.json(post);
});

app.post('/api/posts/:id/like', async (req, res) => {
    const post = await Post.findById(req.params.id);
    const { userId } = req.body;
    if (post.likes.includes(userId)) post.likes = post.likes.filter(id => id.toString() !== userId);
    else post.likes.push(userId);
    await post.save();
    res.json(post);
});

// --- 3. PROFILE & FOLLOW API ---
app.get('/api/users/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username })
        .populate('followers', 'username profilePic')
        .populate('following', 'username profilePic');
    const posts = await Post.find({ username: req.params.username }).sort({ createdAt: -1 });
    res.json({ user, posts });
});

app.post('/api/users/:id/follow', async (req, res) => {
    const target = await User.findById(req.params.id);
    const me = await User.findById(req.body.currentUserId);
    if (!me.following.includes(target._id)) {
        me.following.push(target._id);
        target.followers.push(me._id);
    } else {
        me.following = me.following.filter(id => id.toString() !== target._id.toString());
        target.followers = target.followers.filter(id => id.toString() !== me._id.toString());
    }
    await me.save(); await target.save();
    res.json({ success: true });
});

// --- 4. MESSAGES API ---
app.get('/api/messages/:u1/:u2', async (req, res) => {
    const msgs = await Message.find({
        $or: [{sender:req.params.u1, receiver:req.params.u2}, {sender:req.params.u2, receiver:req.params.u1}]
    }).sort({ createdAt: 1 });
    res.json(msgs);
});

app.post('/api/messages', async (req, res) => {
    const m = new Message(req.body);
    await m.save();
    res.json(m);
});

/* Add to server.js */

// --- COMMENT API ---
app.post('/api/posts/:id/comment', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const { username, text } = req.body;
        
        post.comments.push({ username, text, createdAt: new Date() });
        await post.save();
        
        res.json(post);
    } catch (e) {
        res.status(400).json({ error: "Could not post comment" });
    }
});

app.listen(5000, () => console.log(" Nexus Server running on http://localhost:5000"));  