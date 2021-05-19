var timer;

$("#searchBox").keydown((event) => {
    clearTimeout(timer);
    var textbox = $(event.target);
    var value = textbox.val();
    var searchType = textbox.data().search; //in searchPage.pug, the input has data-search=selectedTab (either posts or users, depending on which tab I selected)
    console.log(searchType);
    timer = setTimeout(() => {
        value = textbox.val().trim();

        if (value == "") {
            $(".resultsContainer").html("");
        }
        else {
            // console.log(value);
            // console.log(searchType);
            search(value, searchType);
        }
    }, 1000)

})

function search(searchTerm, searchType) {
    var url = searchType == "users" ? "/api/users" : "/api/posts"

    $.get(url, { search: searchTerm }, (results) => {
        if (searchType == "users") {
            outputUsers(results, $(".resultsContainer"));
        }
        else {
            outputPosts(results, $(".resultsContainer"))
        }
    })
}