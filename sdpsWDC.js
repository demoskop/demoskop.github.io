var isValidLogin = function () {
    return ($("#email").val().length > 0 && $("#password").val().length > 0);
};

var getAuthBody = function () {
    return JSON.stringify({
        email: tableau.username,
        password: tableau.password,
        loginMethod: "password"
    });
};

var createProjectListButton = function (projectId) {
    //? container

    var li = document.createElement("li");
    li.className = "list-group-item";

    var outerDiv = document.createElement("div");
    outerDiv.className = "lg-group";
    li.appendChild(outerDiv);

    //? checkbox

    var checkboxSpan = document.createElement("span");
    checkboxSpan.className = "lg-checkBox";
    outerDiv.appendChild(checkboxSpan);

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "lg-checkItem";
    checkbox.addEventListener("change", function () {
        var splitIds = $("#projectIds").text() === "" ? [] : $("#projectIds").text().split(",");

        if (this.checked) {
            splitIds.push(projectId);
            var joinedIds = splitIds.join(',');
            $("#projectIds").text(joinedIds);
        } else {
            splitIds = splitIds.filter(function (e) { return e !== projectId });
            var joinedIds = splitIds.join(',');
            $("#projectIds").text(joinedIds);
        }
        tableau.log($("#projectIds").text());

        $("#btnFetch").prop('disabled', $("#projectIds").text() === '');
    });
    checkboxSpan.appendChild(checkbox);

    //? info

    var infoDiv = document.createElement("div");
    outerDiv.appendChild(infoDiv);

    var h4 = document.createElement("h4");
    h4.innerHTML = projectId;
    h4.className = "list-group-item-heading";
    infoDiv.appendChild(h4);

    return li;
};

var populateProjectList = function (data) {
    //? First clear the list first of old cached content
    $("#lgProjects").empty();

    //? then loop through the project id data
    $.each(data, function (i, item) {

        //? last append the item(s) to the list
        var li = createProjectListButton(item);
        $("#lgProjects").append(li);
    });
};

var getCategories = function (aToken) {
    $.ajax({
        type: "GET",
        url: "https://sdps-api.azurewebsites.net/api/v1/survey/available-projects",
        headers: { "Authorization": 'Bearer ' + aToken },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
            populateProjectList(data);
        },
        error: function (error) {
            var errorText = error.responseText ? error.responseText : "Unexpected error";
            tableau.log(errorText);
        }
    });
};

(function () {
    var myConnector = tableau.makeConnector();

    myConnector.init = function (initCallback) {
        tableau.authType = tableau.authTypeEnum.custom;
        tableau.log("in " + tableau.phase + " phase");
        initCallback();
    }

    myConnector.getSchema = function (schemaCallback) {
        var cols = [{
            id: "Id",
            dataType: tableau.dataTypeEnum.int,
            description: "No need for a description"
        }, {
            id: "CreatedOn",
            alias: "Created on",
            dataType: tableau.dataTypeEnum.datetime
        }, {
            id: "PublishedOn",
            alias: "Published on",
            dataType: tableau.dataTypeEnum.datetime
        }, {
            id: "Question",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Answer",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Attribute",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Base",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Dimension",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Facet",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Group",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "SubGroup",
            alias: "Sub group",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "UploadId",
            alias: "Upload id",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Value",
            dataType: tableau.dataTypeEnum.float
        }, {
            id: "ValueType",
            alias: "Value type",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "ProjectId",
            alias: "Project id",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "SubProjectId",
            alias: "Sub project id",
            dataType: tableau.dataTypeEnum.string
        }];

        var tableSchema = {
            id: "Project_" + tableau.connectionName,
            alias: tableau.connectionName,
            columns: cols
        };

        schemaCallback([tableSchema]);
    };

    myConnector.getData = function (table, doneCallback) {
        var projectIds = tableau.connectionData;
        var projectUrlQuery = projectIds ? "&projectId=" + projectIds : "";
        var aToken = '';

        var authCall = $.ajax({
            type: "POST",
            url: "https://sdps-api.azurewebsites.net/api/v1/auth",
            data: getAuthBody(),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (tokens) {
                aToken = tokens.aToken;
            },
            error: function (error) {
                var errorText = error.responseText ? error.responseText : "Unexpected error";
                tableau.log(errorText);
            }
        });

        authCall.then(function () {
            var isSuccess = authCall.status === 200;
            var hasToken = (aToken && aToken.length > 0);

            if (isSuccess && hasToken) {
                $.ajax({
                    url: "https://sdps-api.azurewebsites.net/api/v1/survey?limit=-1" + projectUrlQuery,
                    type: "GET",
                    headers: { 'Authorization': 'Bearer ' + aToken },
                    success: function (response) {
                        var items = response.items, tableData = [];
                        var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                        for (var i = 0; i < items.length; i++) {
                            tableData.push({
                                "Id": items[i].id,
                                "CreatedOn": new Date(items[i].createdOn).toLocaleString(undefined, options),
                                "PublishedOn": new Date(items[i].publishedOn).toLocaleString(),
                                "Question": items[i].question,
                                "Answer": items[i].answer,
                                "Attribute": items[i].attribute,
                                "Base": items[i].base,
                                "Dimension": items[i].dimension,
                                "Facet": items[i].facet,
                                "Group": items[i].group,
                                "SubGroup": items[i].subGroup,
                                "UploadId": items[i].uploadId,
                                "Value": items[i].value,
                                "ValueType": items[i].valueType,
                                "ProjectId": items[i].projectId,
                                "SubProjectId": items[i].subProjectId,
                            });
                        }
                        table.appendRows(tableData);
                        doneCallback();
                    },
                    error: function (xhr, ajaxOptions, thrownError) {
                        tableau.abortWithError("Unable to get data");
                    }
                });
            }
        });
    };
    tableau.registerConnector(myConnector);

    $(document).ready(function () {
        $("#btnFetch").click(function () {
            var projectIds = $("#projectIds").text();
            tableau.connectionName = projectIds.replace(',', '_');
            tableau.connectionData = projectIds;
            tableau.submit();
        });

        $("#btnLogin").click(function () {
            var aToken = '';

            //? validate form
            if (!isValidLogin()) {
                $("#loginStatus").text("Enter login credentials");
                return;
            }

            //? set credentials
            $("#btnLogin").attr("disabled", true);
            tableau.username = $('#email').val().trim();
            tableau.password = $('#password').val().trim();

            //? attempt login
            var authCall = $.ajax({
                type: "POST",
                url: "https://sdps-api.azurewebsites.net/api/v1/auth",
                data: getAuthBody(),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (tokens) {
                    aToken = tokens.aToken;
                    $("#loginContainer").css('display', 'none');
                    $("#surveyContainer").css('display', 'block');
                    $("#btnLogout").css('display', 'block');
                },
                error: function (error) {
                    var errorText = error.responseText ? error.responseText : "Unexpected error";
                    $("#btnLogin").attr("disabled", false);
                    $("#loginStatus").text(errorText);
                }
            });

            authCall.then(function () {
                var isSuccess = authCall.status === 200;
                var hasToken = (aToken && aToken.length > 0);

                if (isSuccess && hasToken) {
                    getCategories(aToken);
                }
            });
        });

        $("#btnLogout").click(function () {
            $("#projectIds").text("");
            $("#loginStatus").text("");
            $("#btnLogin").attr("disabled", false);
            $("#loginContainer").css('display', 'block');
            $("#surveyContainer").css('display', 'none');
            $("#btnLogout").css('display', 'block');
            tableau.username = '';
            tableau.password = '';
            tableau.connectionName = '';
        });
    });
})();