/* public/js/script.js */
const API = "http://localhost:5000/api";
const me = JSON.parse(localStorage.getItem("user"));

// --- 1. ROUTER: Runs on every page load ---
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    
    // Auth Guard
    if ((path.includes("feed") || path.includes("profile") || path.includes("chat")) && !me) {
        window.location.href = "login.html";
    }

    if (path.includes("feed")) loadFeed();
    if (path.includes("profile")) loadProfile();
    if (path.includes("chat")) loadChat();
});

// --- 2. AUTH LOGIC ---
async function handleAuth(event, type) {
    event.preventDefault();
    const u = document.getElementById("u").value;
    const p = document.getElementById("p").value;

    const res = await fetch(`${API}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    });

    const data = await res.json();
    if (res.ok) {
        if (type === 'login') {
            localStorage.setItem("user", JSON.stringify(data));
            window.location.href = "feed.html";
        } else {
            alert("Success! Now Login.");
            window.location.href = "login.html";
        }
    } else alert(data.error);
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// --- 3. FEED LOGIC ---
/* Update in public/js/script.js */

async function loadFeed() {
    const res = await fetch(`${API}/posts`);
    const posts = await res.json();
    const container = document.getElementById("feed-container");

    container.innerHTML = posts.map(p => `
        <div class="card-nexus mb-4 shadow-sm">
            <div class="p-3 d-flex align-items-center">
                <img src="${p.userPic}" class="rounded-circle me-2 border" width="38" height="38">
                <a href="profile.html?u=${p.username}" class="fw-bold text-dark text-decoration-none">@${p.username}</a>
            </div>

            <div class="position-relative">
                <img src="${p.image}" class="post-img w-100" ondblclick="likePost('${p._id}')" style="cursor: pointer;">
                <div class="heart-overlay" id="overlay-${p._id}"><i class="fa-solid fa-heart"></i></div>
            </div>

            <div class="p-3">
                <div class="d-flex gap-3 mb-2 fs-4">
                    <i class="fa-heart pointer ${p.likes.includes(me._id) ? 'fa-solid text-danger' : 'fa-regular'}" 
                       onclick="likePost('${p._id}')"></i>
                    <i class="fa-regular fa-comment pointer" onclick="document.getElementById('comment-input-${p._id}').focus()"></i>
                </div>
                <p class="mb-1 fw-bold">${p.likes.length} likes</p>
                <p class="mb-2"><b>${p.username}</b> ${p.caption}</p>
                
                <div class="comments-list mb-3 small" style="max-height: 80px; overflow-y: auto;">
                    ${p.comments.map(c => `<div><b>${c.username}</b> ${c.text}</div>`).join('')}
                </div>

                <div class="input-group input-group-sm border-top pt-2">
                    <input type="text" id="comment-input-${p._id}" class="form-control border-0 bg-transparent" placeholder="Add a comment...">
                    <button class="btn btn-link text-primary fw-bold text-decoration-none" onclick="addComment('${p._id}')">Post</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input.value) return;

    await fetch(`${API}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: me.username, text: input.value })
    });

    input.value = "";
    loadFeed(); // Refresh to show new comment
}

// --- 4. PROFILE LOGIC ---
async function loadProfile() {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('u') || me.username;
    
    const res = await fetch(`${API}/users/${username}`);
    const { user, posts } = await res.json();

    document.getElementById("p-pic").src = user.profilePic;
    document.getElementById("p-name").innerText = "@" + user.username;
    document.getElementById("p-bio").innerText = user.bio;
    document.getElementById("stat-posts").innerText = posts.length;
    document.getElementById("stat-followers").innerText = user.followers.length;
    document.getElementById("stat-following").innerText = user.following.length;

    const actionBtn = document.getElementById("action-btn");
    const chatBtn = document.getElementById("chat-btn");

    if (user.username !== me.username) {
        chatBtn.classList.remove("d-none");
        chatBtn.onclick = () => window.location.href = `chat.html?with=${user.username}`;
        
        const isFollowing = user.followers.some(f => f._id === me._id);
        actionBtn.innerText = isFollowing ? "Unfollow" : "Follow";
        actionBtn.onclick = () => toggleFollow(user._id);
    } else {
        actionBtn.innerText = "Logout";
        actionBtn.onclick = logout;
    }

    document.getElementById("p-grid").innerHTML = posts.map(p => `
        <div class="col-4">
            <img src="${p.image}" class="post-img rounded shadow-sm">
        </div>
    `).join('');
}

async function toggleFollow(id) {
    await fetch(`${API}/users/${id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: me._id })
    });
    loadProfile();
}

// --- 5. CHAT LOGIC ---
async function loadChat() {
    const params = new URLSearchParams(window.location.search);
    const partner = params.get('with');
    document.getElementById("chat-partner").innerText = partner;

    const res = await fetch(`${API}/messages/${me.username}/${partner}`);
    const msgs = await res.json();
    const box = document.getElementById("chat-box");

    box.innerHTML = msgs.map(m => `
        <div class="bubble ${m.sender === me.username ? 'me' : 'them'}">${m.text}</div>
    `).join('');
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const partner = new URLSearchParams(window.location.search).get('with');
    const input = document.getElementById("chat-input");
    if (!input.value) return;

    await fetch(`${API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: me.username, receiver: partner, text: input.value })
    });
    input.value = "";
    loadChat();
}

// --- DOUBLE TAP LIKE LOGIC ---
async function likePost(id) {
    const res = await fetch(`${API}/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me._id })
    });
    if (res.ok) loadFeed(); // Refresh to update heart state and count
}

// --- CREATE POST LOGIC ---
async function handlePost(event) {
    event.preventDefault();
    const caption = document.getElementById("post-caption").value;
    const image = document.getElementById("post-image").value;

    if (!caption || !image) return alert("Please fill all fields");

    const res = await fetch(`${API}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me._id, caption, image })
    });

    if (res.ok) {
        document.getElementById("post-form").reset();
        // Close the modal (Bootstrap logic)
        const modal = bootstrap.Modal.getInstance(document.getElementById('postModal'));
        modal.hide();
        loadFeed();
    }
}