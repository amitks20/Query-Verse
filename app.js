const express = require("express");
const app=express();

const userModel = require("./models/user");
const postModel = require("./models/post");
const commentModel = require("./models/comment");

const cookieParser = require("cookie-parser");
const bcrypt=require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require('path');

app.set("view engine" , "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());

const upload = require("./config/multerconfig");


app.get("/", async (req,res)=>{
    let allPosts = await postModel.find().populate("user", "username"); 

    res.render("home", {allPosts });
    //res.render("index");
    
});

app.get("/profile/upload", async (req,res)=>{
    
    res.render("profileupload");
    
});

app.post("/upload", isLoggedIn, upload.single("image"),async (req,res)=>{
    
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
    
});

app.get("/comment/:id", async(req,res)=>{
    try {
                // Find the post by its ID and populate user and comments
                let post = await postModel.findById(req.params.id)
                    .populate("user", "username")
                    .populate({
                        path: "comments", // Populate the comments array
                        populate: {
                            path: "user", // Populate user for each comment
                            select: "username"
                        }
                    });
        
                if (!post) {
                    return res.status(404).send("Post not found");
                }
        
                // Render the comment view and pass the post data to the view
                res.render("comment", { post });
            } catch (err) {
                console.error(err);
                res.status(500).send("Server error");
            }
});

// Route for adding a comment to a post
app.post("/comment/:id", isLoggedIn, async (req, res) => {
    try {
        // Find the post
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).send("Post not found");
        }

        // Create a new comment
        const newComment = new commentModel({
            content: req.body.content,
            user: req.user.userid, // Assuming req.user has the logged-in user
            post: post._id
        });

        // Save the comment to the database
        await newComment.save();

        // Push the new comment to the post's comments array
        post.comments.push(newComment._id);
        await post.save();

        // Redirect to the comment page to see the new comment
        res.redirect(`/comment/${post._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/loggedHome", async (req,res)=>{
    let allPosts = await postModel.find().populate("user", "username"); 

    res.render("loggedHome", {allPosts });
    //res.render("index");
    
});

app.get("/register", (req,res)=>{
    res.render("index");
})

app.get("/login", (req,res)=>{
    res.render("login");
});

app.get("/profile", isLoggedIn , async (req,res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate("posts");

    res.render("profile", {user});
    

});

app.get("/like/:id", isLoggedIn, async (req,res) =>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    //res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req,res)=>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    res.render("edit",{post});
});

app.post("/update/:id", isLoggedIn, async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});

    res.redirect("/profile");
});

app.post("/post", isLoggedIn , async (req,res)=>{
    let user = await userModel.findOne({email: req.user.email});

    let {content} = req.body;

    let post = await postModel.create({
        user: user._id,
        content
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
    

})

app.post("/register", async (req,res)=>{
    let {email,name,username, password,age}=req.body;

    let user=await userModel.findOne({email});
    if(user) return res.status(500).send("User Already Registered");

    bcrypt.genSalt(10, (err,salt)=> {
        bcrypt.hash(password, salt, async (err,hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            });
            let token = jwt.sign({email: email, userid: user._id}, "shhhh");
            res.cookie("token",token);
            res.redirect("profile");
        });

    });
});

app.post("/login", async (req,res)=>{
    let {email, password}=req.body;

    let user=await userModel.findOne({email});
    if(!user) return res.status(500).send("Something went Wrong");

    bcrypt.compare(password, user.password, function(err,result){
        if(result) {
            
            let token = jwt.sign({email: email, userid: user._id}, "shhhh");
            res.cookie("token",token);
            res.redirect("/loggedHome");
        }
        else res.redirect("/login");
    });
});

app.get("/logout", (req,res)=>{
    res.cookie("token","");
    res.redirect("/");
});

app.get("/about", async (req,res)=>{
    res.render("about");
});

app.get("/contact", async (req,res)=>{
    res.render("contact");
});

function isLoggedIn(req,res, next){
    if(req.cookies.token === "") res.redirect("/login");
    else{
        let data= jwt.verify(req.cookies.token,"shhhh");
        req.user = data;
        next();
    }
}

app.listen(3000);