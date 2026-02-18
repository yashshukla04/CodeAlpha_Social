/* seed.js */
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { User, Post, Message } = require('./models/Schemas');

const seedData = async () => {
    try {
        await connectDB();

        // 1. Clear existing data to avoid duplicates
        console.log("🧹 Clearing old data...");
        await User.deleteMany({});
        await Post.deleteMany({});
        await Message.deleteMany({});

        // 2. Create 5 Default Users
        console.log("👤 Creating Users...");
        const users = [];
        const demoUsers = [
            { u: "code_alpha", b: "Official CodeAlpha Intern Account " },
            { u: "tech_savvy", b: "Full Stack Enthusiast | MERN Developer" },
            { u: "pixel_perfect", b: "UI/UX Designer & Photographer " },
            { u: "fitness_freak", b: "Calisthenics & MMA Training " },
            { u: "java_pro", b: "Backend Architect | Java & Spring Boot" }
        ];

        for (const user of demoUsers) {
            const newUser = new User({
                username: user.u,
                password: "123", // Simple password for testing
                bio: user.b,
                profilePic: `https://ui-avatars.com/api/?name=${user.u}&background=random&color=fff&size=128`
            });
            const savedUser = await newUser.save();
            users.push(savedUser);
        }

        // 3. Establish Follower Relationships (Everyone follows code_alpha)
        console.log(" Establishing Follower Relationships...");
        const admin = users[0];
        for (let i = 1; i < users.length; i++) {
            users[i].following.push(admin._id);
            admin.followers.push(users[i]._id);
            await users[i].save();
        }
        await admin.save();

        // 4. Create Engaging Posts
        console.log("📸 Generating Posts with Likes and Comments...");
        const postData = [
            { 
                img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", 
                cap: "Late night coding sessions are the best. Building Nexus! 💻 #MERN #CodeAlpha" 
            },
            { 
                img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800", 
                cap: "Clean code is not written, it's rewritten. 🛠️" 
            },
            { 
                img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800", 
                cap: "Morning workout done. Consistency is key! 🔥" 
            }
        ];

        for (let i = 0; i < postData.length; i++) {
            const newPost = new Post({
                userId: users[i % users.length]._id,
                username: users[i % users.length].username,
                userPic: users[i % users.length].profilePic,
                image: postData[i].img,
                caption: postData[i].cap,
                likes: [users[0]._id, users[1]._id], // Pre-liked
                comments: [
                    { username: users[2].username, text: "This looks amazing! 🔥" },
                    { username: users[0].username, text: "Great work on the project." }
                ]
            });
            await newPost.save();
        }

        // 5. Seed Pre-existing Chat Conversations
        console.log(" Seeding Chat History...");
        const demoMessages = [
            { s: users[1].username, r: users[0].username, t: "Hey CodeAlpha! My project is almost done." },
            { s: users[0].username, r: users[1].username, t: "That's great! Make sure to update the README." },
            { s: users[1].username, r: users[0].username, t: "Will do. Thanks for the feedback!" }
        ];

        for (const msg of demoMessages) {
            await new Message({
                sender: msg.s,
                receiver: msg.r,
                text: msg.t
            }).save();
        }

        console.log("-----------------------------------------");
        console.log(" SUCCESS: Nexus Project Seeded!");
        console.log("Default Login: code_alpha / 123");
        console.log("-----------------------------------------");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

seedData();