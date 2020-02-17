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
    //? create a button and attach some content.
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-group-item";
    btn.addEventListener("click", function () {
        tableau.connectionName = projectId;
        tableau.submit();
    }, false);

    var h4 = document.createElement("h4");
    h4.innerHTML = projectId;
    h4.className = "list-group-item-heading";
    btn.appendChild(h4);

    var paragraph = document.createElement("p");
    paragraph.innerHTML = "Created: 2020-02-03 | Published: 2020-05-03";
    paragraph.className = "list-group-item-text";
    btn.appendChild(paragraph);

    return btn;
};

var populateProjectList = function (data) {
    //? First clear the list first of old cached content
    $("#lgProjects").empty();

    //? then loop through the project id data
    $.each(data, function (i, item) {

        //? last append the button(s) to the list
        var btn = createProjectListButton(item);
        $("#lgProjects").append(btn);
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
            id: "SubQuestion",
            alias: "Sub question",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "DataIndex",
            alias: "Data index",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "DataValue",
            alias: "Data value",
            dataType: tableau.dataTypeEnum.float
        }, {
            id: "Brand",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "MeasurementType",
            alias: "Measurement type",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "Country",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "ProjectId",
            alias: "Project id",
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
        var projectId = tableau.connectionName;
        var projectUrlQuery = projectId ? "&projectId=" + projectId : "";
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
                                "SubQuestion": items[i].subQuestion,
                                "DataIndex": items[i].dataIndex,
                                "DataValue": items[i].dataValue,
                                "Brand": items[i].brand,
                                "MeasurementType": items[i].measurementType,
                                "Country": items[i].country,
                                "ProjectId": items[i].projectId,
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