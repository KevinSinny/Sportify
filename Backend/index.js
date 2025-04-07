import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import multer from "multer"



dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "http://localhost:5173" })); // Allow requests from frontend
app.use(express.json()); // Parse JSON request bodies


// With this block:
const db = mysql.createConnection(process.env.DATABASE_URL);

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL Database");
  }
});

app.post("/api/signup", async (req, res) => {
  const { username, email, password, profile_picture, is_admin } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // 🔍 Check if user already exists using async/await
    const userExists = await new Promise((resolve, reject) => {
      const checkSql = "SELECT * FROM users WHERE email = ?";
      db.query(checkSql, [email], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results.length > 0);
      });
    });

    if (userExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    // ✅ Proceed to insert user
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertSql = "INSERT INTO users (username, email, password_hash, profile_picture, is_admin) VALUES (?, ?, ?, ?, ?)";

    await new Promise((resolve, reject) => {
      db.query(insertSql, [username, email, hashedPassword, profile_picture || null, is_admin || 0], (err, result) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return res.status(201).json({ message: "✅ User registered successfully" });

  } catch (error) {
    console.error("❌ Signup error:", error);
    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
});


// 🔹 LOGIN API
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Find user in database
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("❌ Error checking user:", err);
      return res.status(500).json({ message: "Login failed" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];

    // Compare entered password with hashed password from database
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Return user data (excluding sensitive fields like password_hash)
    const userData = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      profile_picture: user.profile_picture,
      age: user.age,
      created_at: user.created_at,
    };

    res.status(200).json({ message: "✅ Login successful", token, user: userData });
  });
});
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Rename file
  }
});

const upload = multer({ storage });

// Serve static files
app.use("/uploads", express.static("uploads"));

// Profile picture upload route
app.post("/api/upload", upload.single("profilePic"), (req, res) => {
  if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// ✅ Fetch Standings API
app.get("/api/standings/:leagueId", async (req, res) => {
  const { leagueId } = req.params;

  try {
    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${leagueId}/standings`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        },
      }
    );

    res.json(response.data.standings[0]?.table || []);
  } catch (error) {
    console.error("❌ Error fetching standings:", error.message);
    res.status(500).json({ message: "Failed to fetch standings" });
  }
});

const getDateRange = () => {
  const today = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(today.getDate() + 14); // Add 14 days

  const formatDate = (date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  return {
      dateFrom: formatDate(today),
      dateTo: formatDate(twoWeeksLater),
  };
};

// Proxy endpoint to fetch fixtures for a specific competition
app.get('/api/fixtures/:leagueId', async (req, res) => {
  try {
      const { leagueId } = req.params;
      const { dateFrom, dateTo } = getDateRange(); // Get date range

      const response = await axios.get(
          `https://api.football-data.org/v4/competitions/${leagueId}/matches`,
          {
              headers: {
                  'X-Auth-Token': process.env.FOOTBALL_API_KEY,
              },
              params: {
                  dateFrom,
                  dateTo,
              },
          }
      );
      res.json(response.data);
  } catch (error) {
      console.error('Error fetching fixtures:', error.message);
      res.status(500).json({ error: 'Failed to fetch fixtures' });
  }
});
app.get("/api/rumors", async (req, res) => {
  try {
    const response = await axios.get(process.env.NEWS_API_URL, {
      params: {
        q: "football transfers OR soccer transfers", // Only fetch football/soccer-related news
        apiKey: process.env.NEWS_API_KEY, // Use NEWS_API_KEY from .env
        pageSize: 50, // Limit the number of results
        language: "en", // Fetch English articles only
        sortBy: "publishedAt", // Sort by latest news
      },
    });

    // Send all football-related news to the frontend
    res.json(response.data.articles);
  } catch (error) {
    console.error("Error fetching news:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// ✅ Live Matches API (Updated with correct endpoint)
app.get("/api/live-matches", async (req, res) => {
  try {
    const url = "https://v3.football.api-sports.io/fixtures?live=all";
    const options = {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.LIVE_SCORES_API_KEY,
        "x-rapidapi-host": process.env.LIVE_SCORES_API_HOST,
      },
    };

    const response = await axios.get(url, options);
    const allMatches = response.data.response || [];

    console.log("🔵 Raw API Response:", allMatches); // Log the raw response

    // Return all live matches globally
    console.log("✅ All Live Matches:", allMatches);
    res.json(allMatches);
  } catch (error) {
    console.error("❌ Error fetching live matches:", error.message);
    res.status(500).json({ message: "Failed to fetch live matches" });
  }
});

// ✅ Match Details API
app.get("/api/match-details/:fixtureId", async (req, res) => {
  const { fixtureId } = req.params;

  try {
    const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
    const options = {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.LIVE_SCORES_API_KEY,
        "x-rapidapi-host": process.env.LIVE_SCORES_API_HOST,
      },
    };

    console.log("🔵 Fetching match details from external API...");
    const response = await axios.get(url, options);
    console.log("🔵 External API Response:", response.data);

    const matchDetails = response.data.response[0];

    if (!matchDetails) {
      console.log("🔴 No match details found for fixture ID:", fixtureId);
      return res.status(404).json({ message: "Match details not found" });
    }

    // Fetch lineups and events
    const lineupUrl = `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`;
    const eventsUrl = `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`;

    console.log("🔵 Fetching lineups and events...");
    const [lineupResponse, eventsResponse] = await Promise.all([
      axios.get(lineupUrl, options),
      axios.get(eventsUrl, options),
    ]);

    // Add lineups and events to matchDetails
    matchDetails.lineups = lineupResponse.data.response || [];
    matchDetails.events = eventsResponse.data.response || [];

    console.log("✅ Match details fetched successfully:", matchDetails);
    res.json(matchDetails);
  } catch (error) {
    console.error("❌ Error fetching match details:", error.message);
    console.error("🔴 API Response:", error.response?.data);
    res.status(500).json({ message: "Failed to fetch match details" });
  }
});

app.get("/api/transfers/filter", (req, res) => {
  const { league, team, ageFrom, ageTo, feeFrom, feeTo, limit = 50, offset = 0 } = req.query;

  let query = "SELECT * FROM transfers WHERE 1=1";
  const params = [];

  if (league) {
    query += " AND league_name = ?";
    params.push(league);
  }
  if (team) {
    query += " AND (to_team = ? OR from_team = ?)";
    params.push(team, team);
  }
  if (ageFrom) {
    query += " AND age >= ?";
    params.push(parseInt(ageFrom, 10));
  }
  if (ageTo) {
    query += " AND age <= ?";
    params.push(parseInt(ageTo, 10));
  }
  if (feeFrom) {
    query += " AND fee >= ?";
    params.push(parseFloat(feeFrom));
  }
  if (feeTo) {
    query += " AND fee <= ?";
    params.push(parseFloat(feeTo));
  }

  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching filtered transfers:", err);
      res.status(500).json({ error: "Database error" });
    } else {
      res.json(results);
    }
  });
});
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized: No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (!req.user.user_id) {
      return res.status(401).json({ message: "Unauthorized: Invalid token (missing user_id)" });
    }
    next();
  } catch (error) {
    console.error("❌ Token Verification Error:", error.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// ✅ Create Post (Only Logged In Users)
app.post("/api/posts", authenticate, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

  try {
    const sql = "INSERT INTO posts (user_id, title, content, likes) VALUES (?, ?, ?, 0)";
    const [result] = await db.promise().query(sql, [req.user.user_id, title, content]);
    res.status(201).json({ message: "✅ Post created successfully", post_id: result.insertId });
  } catch (error) {
    console.error("❌ Post Creation Error:", error);
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
});

// ✅ Get All Posts (Open to All) — includes comments
app.get("/api/posts", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    const [posts] = await db.promise().query(
      `SELECT posts.id, posts.title, posts.content, users.username, posts.created_at, posts.likes 
       FROM posts 
       JOIN users ON posts.user_id = users.user_id 
       ORDER BY posts.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Attach comments to each post
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const [comments] = await db.promise().query(
          `SELECT comments.content, comments.created_at, users.username 
           FROM comments 
           JOIN users ON comments.user_id = users.user_id 
           WHERE comments.post_id = ? 
           ORDER BY comments.created_at ASC`,
          [post.id]
        );
        return { ...post, comments };
      })
    );

    res.status(200).json(postsWithComments);
  } catch (error) {
    console.error("❌ Fetch Posts Error:", error);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

// ✅ Delete Post (Only Author or Admin)
app.delete("/api/posts/:postId", authenticate, async (req, res) => {
  const { postId } = req.params;

  try {
    const [post] = await db.promise().query("SELECT user_id FROM posts WHERE id = ?", [postId]);

    if (!post.length) return res.status(404).json({ message: "Post not found" });
    if (post[0].user_id !== req.user.user_id && !req.user.is_admin)
      return res.status(403).json({ message: "Unauthorized to delete this post" });

    await db.promise().query("DELETE FROM posts WHERE id = ?", [postId]);
    res.status(200).json({ message: "✅ Post deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Post Error:", error);
    res.status(500).json({ message: "Error deleting post" });
  }
});

// ✅ Like Post (Only Logged In Users, One Like Per User)
app.post("/posts/:postId/like", authenticate, async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.user_id;

  try {
    // Check if post exists
    const [post] = await db.promise().query("SELECT * FROM posts WHERE id = ?", [postId]);
    if (!post.length) return res.status(404).json({ message: "Post not found" });

    // Check if already liked
    const [existingLike] = await db.promise().query(
      "SELECT * FROM likes WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );

    if (existingLike.length > 0) {
      return res.status(400).json({ message: "You already liked this post." });
    }

    // Add like
    await db.promise().query("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", [userId, postId]);
    await db.promise().query("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId]);

    res.status(200).json({ message: "Post liked successfully" });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Error processing like" });
  }
});

// ✅ Get Comments for a Post (Open to All)
app.get("/api/posts/:postId/comments/", async (req, res) => {
  const { postId } = req.params;

  try {
    const [comments] = await db
      .promise()
      .query(
        `SELECT comments.id, comments.content, comments.created_at, users.username
         FROM comments 
         JOIN users ON comments.user_id = users.user_id 
         WHERE comments.post_id = ? 
         ORDER BY comments.created_at ASC`,
        [postId]
      );

    res.status(200).json(comments);
  } catch (error) {
    console.error("❌ Fetch Comments Error:", error);
    res.status(500).json({ message: "Error fetching comments", error: error.message });
  }
});

// ✅ Add Comment (Only Logged In Users)
app.post("/api/posts/:postId/comments/", authenticate, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.user_id;

  // Step 1: Validate content
  if (!content || content.trim() === "") {
    return res.status(400).json({ message: "Comment content cannot be empty" });
  }

  try {
    // Step 2: Check if post exists
    const [post] = await db.promise().query("SELECT id FROM posts WHERE id = ?", [postId]);
    if (!post.length) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Step 3: Insert the comment
    await db.promise().query(
      "INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)",
      [userId, postId, content]
    );

    res.status(201).json({ message: "✅ Comment added successfully" });
  } catch (error) {
    console.error("❌ Add Comment Error:", error);
    res.status(500).json({ message: "Error adding comment", error: error.message });
  }
});




// Fetch teams for a specific league
app.get("/api/leagues", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT league_id, league_name, country FROM leagues");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching leagues:", err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});


app.get("/api/teams/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;
    const [rows] = await db.query(
      "SELECT team_id, team_name, stadium, logo FROM teams WHERE league_id = ?", 
      [leagueId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching teams from database:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});


app.get("/api/team/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const [rows] = await db.query(`
      SELECT t.*, l.league_name
      FROM teams t
      JOIN leagues l ON t.league_id = l.league_id
      WHERE t.team_id = ?
    `, [teamId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching team details from DB:", err);
    res.status(500).json({ error: "Failed to fetch team details" });
  }
});


// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});

// Log all registered routes
app._router.stack.forEach((r) => {
  if (r.route) {
    console.log(r.route.path);
  }
});

export default db;