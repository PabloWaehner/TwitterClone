$("#postTextarea, #replyTextarea").keyup(event => {
    var textbox = $(event.target);
    var value = textbox.val().trim();

    // checks if the parents of textbox have the class "modal". If there is an element, the length is 1, 
    // and isModal is true. 
    var isModal = textbox.parents(".modal").length == 1;

    var submitButton = isModal ? $("#submitReplyButton") : $("#submitPostButton");

    if (submitButton.length == 0) return alert("No submit button found");

    if (value == "") {
        submitButton.prop("disabled", true); //sets the disabled property to true
        return;
    }
    submitButton.prop("disabled", false);
})

//the click happens either on submitPostButton or submitReplyButton
$("#submitPostButton, #submitReplyButton").click((event) => {
    var button = $(event.target);

    var isModal = button.parents(".modal").length == 1;
    var textbox = isModal ? $("#replyTextarea") : $("#postTextarea");

    var data = {
        content: textbox.val()
    }

    if (isModal) {
        var id = button.data().id;
        if (id == null) return alert("Button id is null");
        data.replyTo = id; //adds a replyTo property to the data object
    }

    $.post("/api/posts", data, (postData) => {
        if (postData.replyTo) {
            location.reload(); //refreshes the page
        } else {
            // console.log(postData); // it's the Object sent by posts.js in the router.post
            var html = createPostHtml(postData);
            $(".postsContainer").prepend(html); //prepend adds to the beginning, append to the end
            textbox.val("");
            button.prop("disabled", true);
        }
    })
})

//"show.bs.modal": when the modal is open, this will be fired
$("#replyModal").on("show.bs.modal", (event) => {
    var button = $(event.relatedTarget);
    var postId = getPostIdFromElement(button);
    $("#submitReplyButton").data("id", postId); //this is attaching the postId to the submit button (data() stores in jquery's cache, not on the element itself)

    $.get("/api/posts/" + postId, results => {
        outputPosts(results.postData, $("#originalPostContainer"));
    })
})

//when replying another post, the previous one appears for a fraction of a second. This avoids that
$("#replyModal").on("hidden.bs.modal", () => $("#originalPostContainer").html(""));

$("#deletePostModal").on("show.bs.modal", (event) => {
    var button = $(event.relatedTarget);
    var postId = getPostIdFromElement(button);
    $("#deletePostButton").data("id", postId);
})

$("#deletePostButton").click((event) => {
    var postId = $(event.target).data("id");

    $.ajax({
        url: `/api/posts/${postId}`,
        type: "DELETE",
        success: () => {
            location.reload();
        }
    })
})

// $(".likeButton").click((event) => {}) //this doesn't work. At the time that this code is executed, those buttons are not on the page
$(document).on("click", ".likeButton", (event) => { //this is attaching the click handler to the document itself. So now the whole page will listen for the elements with .likeButton
    var button = $(event.target);
    var postId = getPostIdFromElement(button);

    if (postId === undefined) return;

    $.ajax({ //there is no such thing as $.put, only $.get and $.post
        url: `/api/posts/${postId}/like`,
        type: "PUT", // it also works with "GET" or "POST"
        success: (postData) => { //postData is what is returned in posts.js, in router.put("/:id/like")
            button.find("span").text(postData.likes.length || "");
            if (postData.likes.includes(userLoggedIn._id)) {
                button.addClass("active");
            } else {
                button.removeClass("active");
            }
        }
    })
})

$(document).on("click", ".retweetButton", (event) => {
    var button = $(event.target);
    var postId = getPostIdFromElement(button);

    if (postId === undefined) return;

    $.ajax({
        url: `/api/posts/${postId}/retweet`,
        type: "POST",
        success: (postData) => {
            button.find("span").text(postData.retweetUsers.length || "");
            if (postData.retweetUsers.includes(userLoggedIn._id)) {
                button.addClass("active");
            } else {
                button.removeClass("active");
            }
        }
    })
})

$(document).on("click", ".post", (event) => {
    var element = $(event.target);
    var postId = getPostIdFromElement(element);

    if (postId !== undefined && !element.is("button")) { //the second condition is needed, because otherwise clicking a button would send us to /post/ + postId
        window.location.href = '/posts/' + postId; //directs us to that url
    }
});

$(document).on("click", ".followButton", (event) => {
    var button = $(event.target);
    var userId = button.data().user;

    $.ajax({
        url: `/api/users/${userId}/follow`,
        type: "PUT",
        success: (data, status, xhr) => {
            if (xhr.status == 404) { //user not found
                return;
            }

            var difference = 1;
            if (data.following && data.following.includes(userId)) {
                button.addClass("following");
                button.text("Following");
            } else {
                button.removeClass("following");
                button.text("Follow");
                difference = -1;
            }

            var followersLabel = $("#followersValue");
            if (followersLabel.length != 0) {
                var followersText = followersLabel.text();
                followersText = parseInt(followersText);
                followersLabel.text(followersText + difference);
            }
        }
    })
});

function getPostIdFromElement(element) { //it will go up through the tree and find the post id
    var isRoot = element.hasClass("post"); // to determine if I'm clicking on the post or on one of the buttons
    var rootElement = isRoot == true ? element : element.closest(".post"); //closest is a jquery function, which goes up the tree to find a parent with the selector
    var postId = rootElement.data().id; //data() returns all data that element has (data-id, data-blah, etc...)

    if (postId === undefined) return alert("Post is undefined");

    return postId;
}

function createPostHtml(postData, largeFont = false) { //Reminder: default value is false
    if (postData == null) return alert("post object is null");

    var isRetweet = postData.retweetData !== undefined;
    var retweetedBy = isRetweet ? postData.postedBy.username : null;
    postData = isRetweet ? postData.retweetData : postData;

    var postedBy = postData.postedBy;

    if (postedBy._id === undefined) {
        return console.log("User object not populated");
    }
    var displayName = postedBy.firstName + " " + postedBy.lastName;
    var timestamp = timeDifference(new Date(), new Date(postData.createdAt)); //creating an instance of the Date Object without parameters returns the current date

    var likeButtonActiveClass = postData.likes.includes(userLoggedIn._id) ? "active" : ""; //if the post has the user id in the likes (the user liked it), then the variable is "active", otherwise empty string
    var retweetButtonActiveClass = postData.retweetUsers.includes(userLoggedIn._id) ? "active" : "";
    var largeFontClass = largeFont ? "largeFont" : "";

    var retweetText = '';
    if (isRetweet) {
        retweetText = `<span>
                        <i class='fas fa-retweet'></i>
                        Retweeted by <a href='/profile/${retweetedBy}'>@${retweetedBy}</a>
                       </span>`
    }

    var replyFlag = "";
    if (postData.replyTo && postData.replyTo._id) {
        if (!postData.replyTo._id) {
            return alert("Reply to is not populated");
        } else if (!postData.replyTo.postedBy._id) {
            return alert("Posted by is not populated");
        }
        var replyToUsername = postData.replyTo.postedBy.username;
        replyFlag = `<div class='replyFlag'>
                        Replying to <a href='/profile/${replyToUsername}'>@${replyToUsername}<a>
                     </div>`;
    }

    var buttons = "";
    if (postData.postedBy._id == userLoggedIn._id) { //if the post belongs to the user that is logged in
        buttons = `<button data-id="${postData._id}" data-toggle="modal" data-target="#deletePostModal"><i class='fas fa-times'></i></button>`;
    }

    return `<div class='post ${largeFontClass}' data-id='${postData._id}'>
                <div class='postActionContainer'>
                    ${retweetText}
                </div>
                <div class='mainContentContainer'>
                    <div class='userImageContainer'>
                        <img src='${postedBy.profilePic}'>
                    </div>
                    <div class='postContentContainer'>
                        <div class='header'>
                            <a href='/profile/${postedBy.username}' class='displayName'>${displayName}</a>
                            <span class='username'>@${postedBy.username}</span>
                            <span class='date'>${timestamp}</span>
                            ${buttons}
                        </div>
                        ${replyFlag}
                        <div class='postBody'>
                            <span>${postData.content}</span>
                        </div>
                        <div class='postFooter'>
                            <div class='postButtonContainer'>
                            <!--data-toggle and data-target is found on the bootstrap code snippet, we have to copy it from there-->
                            <!--#replyModal is the id found in mixins.pug-->
                                <button data-toggle='modal' data-target='#replyModal'> 
                                    <i class='far fa-comment'></i>
                                </button>
                            </div>
                            <div class='postButtonContainer green'>
                                <button class='retweetButton ${retweetButtonActiveClass}'>
                                    <i class='fas fa-retweet'></i>
                                    <span>${postData.retweetUsers.length || ""}</span>
                                </button>
                            </div>
                            <div class='postButtonContainer red'>
                                <button class='likeButton ${likeButtonActiveClass}'>
                                    <i class='far fa-heart'></i>
                                    <span>${postData.likes.length || ""}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
}

//to show when a post was created
function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous; //previous is the moment the post was created, current is now

    if (elapsed < msPerMinute) {
        if (elapsed / 1000 < 30) return "Just now"; //if it's less than 30 seconds ago
        return Math.round(elapsed / 1000) + ' seconds ago';
    }
    else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' minutes ago';
    }
    else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hours ago';
    }
    else if (elapsed < msPerMonth) {
        return Math.round(elapsed / msPerDay) + ' days ago';
    }
    else if (elapsed < msPerYear) {
        return Math.round(elapsed / msPerMonth) + ' months ago';
    }
    else {
        return Math.round(elapsed / msPerYear) + ' years ago';
    }
}

function outputPosts(results, container) {
    container.html("");

    if (!Array.isArray(results)) { //if results is not an array, make it an array (forEach is for arrays)
        results = [results];
    }

    results.forEach(result => {
        var html = createPostHtml(result);
        container.append(html);
    });

    if (results.length == 0) {
        container.append("<span class='noResults'>Nothing to show</span>");
    }
}

function outputPostsWithReplies(results, container) {
    container.html("");

    if (results.replyTo !== undefined && results.replyTo._id !== undefined) { //we make sure it's populated
        var html = createPostHtml(results.replyTo);
        container.append(html);
    }

    var mainPostHtml = createPostHtml(results.postData, true);
    container.append(mainPostHtml);

    results.replies.forEach(result => {
        var html = createPostHtml(result);
        container.append(html);
    });
}

