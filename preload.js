const ALIYUN_MAVEN_BASE_URL = "https://maven.aliyun.com/artifact/aliyunMaven/searchArtifactByWords?repoId=${repoid}&queryTerm=${name}&_input_charset=utf-8"

var timeout = null
var searchItems = null
var versionItems = null

/**
 * 请求阿里仓库
 * @param {*} url 
 * @param {*} type 
 */
function request(options) {
    var url = ALIYUN_MAVEN_BASE_URL.replace('${repoid}', options.type).replace('${name}', options.name)
    console.log("url", url)
    var ajax = new XMLHttpRequest()
    ajax.open('get', url)
    ajax.send()
    ajax.onreadystatechange = function () {
        if (ajax.readyState == 4) {
            if (ajax.status == 200) {
                options.success && options.success(ajax.responseText)
            } else {
                options.fail && options.fail(ajax.responseText)
            }
        }
    }
}

function copySuccess() {
    utools.showMessageBox({
        type: 'info',
        title: '复制成功',
        message: '已经复制到系统剪切板，粘贴到响应的位置即可'
    })
}

/**
 * 数据整理，排除所有不为pom的数据
 * @param {*} object 要整理的数据
 */
function dataCollation(object) {
    var container = {}
    object.forEach(element => {
        // 判断当前元素是否为pom，是的话合并或者添加
        if (element.packaging === 'pom') {
            // 组合key
            var key = element.groupId + ":" + element.artifactId

            var item = {
                artifactId: element.artifactId,
                fileName: element.fileName,
                groupId: element.groupId,
                version: element.version,
            }

            // 存在则合并
            if (container.hasOwnProperty(key)) {
                container[key].items[item.version] = item
            } else {
                // 不存在则新建
                container[key] = {
                    items: {}
                }

                container[key].items[item.version] = item
            }
        }
    });
    return container;
}

// 仓库查询查询
var warehouseQuery = function (type, searchWord, callbackSetList) {
    searchItems = null
    var result = []
    request({
        type: type,
        name: searchWord,
        success: function (res) {
            res = JSON.parse(res)
            searchItems = dataCollation(res.object)

            for (const key in searchItems) {
                result.push({
                    title: key
                })
            }

            callbackSetList(result)
        },
        fail: function (error) {
            console.log(error)
            callbackSetList("请求失败，请稍后尝试")
        }
    })
}

/**
 * 根据用户点击的key值，在之前搜索的结果中查询所存在的版本，并显示
 * @param {*} item 
 * @param {*} callbackSetList 
 */
var versionQuery = function (item, callbackSetList) {
    versionItems = null
    var result = []
    versionItems = searchItems[item].items
    for (const key in versionItems) {
        result.push({
            title: key
        })
    }

    callbackSetList(result)
}

/**
 * maven格式内容复制到剪切板
 * @param {*} itemTitle 
 */
var copyMavenText = function (itemTitle) {
    var item = versionItems[itemTitle]

    var resultString = '<dependency>\n\t<groupId>' + item.groupId + '</groupId>\n\t<artifactId>' + item.artifactId + '</artifactId>\n\t<version>' + item.version + '</version>\n</dependency>'

    utools.copyText(resultString)
    copySuccess()
    window.utools.outPlugin()
}

/**
 * gradle格式内容复制到剪切板
 * @param {*} itemTitle 
 */
var copyGradleText = function (itemTitle) {
    var item = versionItems[itemTitle]

    var resultString = "compile group: '" + item.groupId + "', name: '" + item.artifactId + "', version: '" + item.version + "'"

    utools.copyText(resultString)

    copySuccess()
    window.utools.outPlugin()
}

window.exports = {
    // maven中央仓库查询
    "maven-central": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }

                    timeout = setTimeout(function () {
                        warehouseQuery('central', searchWord, callbackSetList)
                    }, 1000)
                } else {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }
                    searchItems = null
                    callbackSetList(null)
                }
            },

            select: (action, itemData, callbackSetList) => {
                if (itemData != null && itemData != undefined) {
                    // 判断用户进行到哪一步
                    if (itemData.title.match(":")) {
                        versionQuery(itemData.title, callbackSetList)
                    } else {
                        copyMavenText(itemData.title)
                    }
                }
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "在此输入搜索内容（搜索结果点击可复制到剪贴板）"
        }
    },
    // gradle中央仓库查询
    "gradle-central": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }

                    timeout = setTimeout(function () {
                        warehouseQuery('central', searchWord, callbackSetList)
                    }, 1000)
                } else {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }
                    searchItems = null
                    callbackSetList(null)
                }
            },

            select: (action, itemData, callbackSetList) => {
                if (itemData != null && itemData != undefined) {
                    // 判断用户进行到哪一步
                    if (itemData.title.match(":")) {
                        versionQuery(itemData.title, callbackSetList)
                    } else {
                        copyGradleText(itemData.title)
                    }
                }
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "在此输入搜索内容（搜索结果点击可复制到剪贴板）"
        }
    },
    // jcenter仓库查询
    "maven-jcenter": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }

                    timeout = setTimeout(function () {
                        warehouseQuery('jcenter', searchWord, callbackSetList)
                    }, 1000)
                } else {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }
                    searchItems = null
                    callbackSetList(null)
                }
            },

            select: (action, itemData, callbackSetList) => {
                if (itemData != null && itemData != undefined) {
                    // 判断用户进行到哪一步
                    if (itemData.title.match(":")) {
                        versionQuery(itemData.title, callbackSetList)
                    } else {
                        copyMavenText(itemData.title)
                    }
                }
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "在此输入搜索内容（搜索结果点击可复制到剪贴板）"
        }
    },
    "gradle-jcenter": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }

                    timeout = setTimeout(function () {
                        warehouseQuery('jcenter', searchWord, callbackSetList)
                    }, 1000)
                } else {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }
                    searchItems = null
                    callbackSetList(null)
                }
            },

            select: (action, itemData, callbackSetList) => {
                if (itemData != null && itemData != undefined) {
                    // 判断用户进行到哪一步
                    if (itemData.title.match(":")) {
                        versionQuery(itemData.title, callbackSetList)
                    } else {
                        copyGradelText(itemData.title)
                    }
                }
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "在此输入搜索内容（搜索结果点击可复制到剪贴板）"
        }
    },

    // google仓库查询
    "maven-google": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }

                    timeout = setTimeout(function () {
                        warehouseQuery('google', searchWord, callbackSetList)
                    }, 1000)
                } else {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }
                    searchItems = null
                    callbackSetList(null)
                }
            },

            select: (action, itemData, callbackSetList) => {
                if (itemData != null && itemData != undefined) {
                    // 判断用户进行到哪一步
                    if (itemData.title.match(":")) {
                        versionQuery(itemData.title, callbackSetList)
                    } else {
                        copyMavenText(itemData.title)
                    }
                }
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "在此输入搜索内容（搜索结果点击可复制到剪贴板）"
        }
    },
    "gradle-google": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }

                    timeout = setTimeout(function () {
                        warehouseQuery('google', searchWord, callbackSetList)
                    }, 1000)
                } else {
                    if (timeout != null) {
                        clearTimeout(timeout)
                    }
                    searchItems = null
                    callbackSetList(null)
                }
            },

            select: (action, itemData, callbackSetList) => {
                if (itemData != null && itemData != undefined) {
                    // 判断用户进行到哪一步
                    if (itemData.title.match(":")) {
                        versionQuery(itemData.title, callbackSetList)
                    } else {
                        copyGradelText(itemData.title)
                    }
                }
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "在此输入搜索内容（搜索结果点击可复制到剪贴板）"
        }
    }
}