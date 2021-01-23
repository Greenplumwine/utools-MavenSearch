
// 阿里仓库不在使用，发现sonatype仓库比阿里仓库要好，不过部分时候传输速度慢，根据网络决定
const SONATYPE_MAVEN_BASE_URL = 'https://search.maven.org/solrsearch/select?q=${querystr}&start=0&rows=100'

// const ALIYUN_MAVEN_BASE_URL = "https://maven.aliyun.com/artifact/aliyunMaven/searchArtifactByWords?repoId=${repoid}&queryTerm=${name}&_input_charset=utf-8"

var timeout = null
var searchItems = null

/**
 * 请求阿里仓库
 * @since 2021年1月23日16:47:21 仓库搜索地址改为 https://search.maven.org/solrsearch/select?q=${querystr}&start=0&rows=100
 * @param {*} url 
 * @param {*} type 
 */
function request(options) {
    // var url = ALIYUN_MAVEN_BASE_URL.replace('${repoid}', options.type).replace('${name}', options.name)

    var url = SONATYPE_MAVEN_BASE_URL.replace('${querystr}', options.select)
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
        // 组合key
        var key = element.id

        var item = {
            g: element.g,
            a: element.a,
        }

        // 是否存在版本号，如果存在，添加
        if (element.v !== undefined) {
            item['v'] = element.v
            key = element.v
        }

        // 保存成合适的格式便于展示
        container[key] = item
    });
    return container;
}

/**
 * 仓库查询查询
 * 更新记录：2021年1月23日16:55:17更改为符合sonatype的查询格式
 * @param {*} searchWord 
 * @param {*} callbackSetList 
 */
var warehouseQuery = function (searchWord, callbackSetList) {
    searchItems = null
    var result = []
    request({
        select: searchWord,
        success: function (res) {
            res = JSON.parse(res)
            console.log('查询出来的结果', res)

            searchItems = dataCollation(res.response.docs)
            console.log('转换后的结果', searchItems)
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
 * 更改记录：根据用户点击的内容，再次调用接口，查询其中的版本号
 * @param {*} item 
 * @param {*} callbackSetList 
 */
var versionQuery = function (item, callbackSetList) {
    versionItems = null
    var result = []
    versionItems = searchItems[item]

    console.log('用户点击的结果', versionItems)

    // 拼接查询字符串
    var searchWord = 'g:' + versionItems.g + ' AND a:' + versionItems.a + '&core=gav'
    // 进行转码
    searchWord = encodeURI(searchWord)

    // 再次查询，查出要搜索的版本号
    request({
        select: searchWord,
        success: function (res) {
            res = JSON.parse(res)
            console.log('查询出来的结果', res)

            searchItems = dataCollation(res.response.docs)
            console.log('转换后的结果', searchItems)
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

    callbackSetList(result)
}

/**
 * maven格式内容复制到剪切板
 * @param {*} itemTitle 
 */
var copyMavenText = function (itemTitle) {

    var item = searchItems[itemTitle]

    var resultString = '<dependency>\n\t<groupId>' + item.g + '</groupId>\n\t<artifactId>' + item.a + '</artifactId>\n\t<version>' + item.v + '</version>\n</dependency>'

    utools.copyText(resultString)
    copySuccess()
    window.utools.outPlugin()
}

/**
 * gradle格式内容复制到剪切板
 * @param {*} itemTitle 
 */
var copyGradleText = function (itemTitle) {
    var item = searchItems[itemTitle]

    var resultString = "compile group: '" + item.g + "', name: '" + item.a + "', version: '" + item.v + "'"

    utools.copyText(resultString)

    copySuccess()
    window.utools.outPlugin()
}

window.exports = {
    // maven格式查询
    "maven": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    warehouseQuery(searchWord, callbackSetList)
                } else {
                    searchItems = null
                    callbackSetList(null)
                }
            },
            // 选择调用
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
    // gradle格式查询
    "gradle": {
        mode: "list",
        args: {
            // 搜索调用
            search: (action, searchWord, callbackSetList) => {
                // 判断用户是否输入内容
                if (searchWord !== null && searchWord !== undefined && searchWord !== '') {
                    warehouseQuery(searchWord, callbackSetList)
                } else {
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
            placeholder: "请输入搜索内容"
        }
    }
}