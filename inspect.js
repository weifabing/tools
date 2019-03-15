WebInspector = {}
WebInspector.DOMPresentationUtils = {}

/**
 * 转成json对象
 */
WebInspector.DOMPresentationUtils.toJSON = function(jsonObj){
    let tmp = Array.prototype.toJSON;
    if(tmp){
        delete Array.prototype.toJSON;
    }
    let jsonMsg = JSON.stringify(jsonObj);
    if(tmp)
        Array.prototype.toJSON = tmp;
    return jsonMsg;
}

/**
 * @param {!WebInspector.DOMNode} node
 * @return {string}
 */
WebInspector.DOMPresentationUtils.simpleSelector = function (node) {
    var lowerCaseName = node.localName || node.nodeName.toLowerCase();
    if (node.nodeType !== Node.ELEMENT_NODE)
        return lowerCaseName;
    if (lowerCaseName === "input" && node.getAttribute("type") && !node.getAttribute("id") && !node.getAttribute("class"))
        return lowerCaseName + "[type=\"" + node.getAttribute("type") + "\"]";
    if (node.getAttribute("id"))
        return lowerCaseName + "#" + node.getAttribute("id");
    if (node.getAttribute("class"))
        return (lowerCaseName === "div" ? "" : lowerCaseName) + "." + node.getAttribute("class").trim().replace(/\s+/g, ".");
    return lowerCaseName;
}

/**
 * 获取目标document,如果有iframe,获取iframe.document
 */
WebInspector.DOMPresentationUtils.findTargetDocument = function(iframesrc){
    var target = CsCodeInspect.iframe.getIframeElement(iframesrc,document);
    return target == null ? document : target.contentDocument;
}

/**
 * 找相似元素
 * @param cssPath
 * @param iframesrc
 */
WebInspector.DOMPresentationUtils.findSimilarElements = function(cssPath,text,iframesrc){
    var target = WebInspector.DOMPresentationUtils.findTargetDocument(iframesrc);
    if(cssPath.indexOf(':nth-child') < 0)
        return '';

    //从第一个nth-child开始替换，直到没有nth-child或找到多个元素
    var cssPathReplaceIndex = cssPath;
    var nodes;
    if(text){
        cssPathReplaceIndex +=  ":contains(\""+text+"\")";
    }
    while(true){
        cssPathReplaceIndex = cssPathReplaceIndex.replace(/:nth-child\(\d*\)/,"");
        nodes = WebInspector.DOMPresentationUtils.querySelector(cssPathReplaceIndex,target);
        if(cssPathReplaceIndex.indexOf(':nth-child') < 0 || nodes.length > 1)
            break;
    }
    
    //返回要将contains去除
    if(text){
        cssPathReplaceIndex = cssPathReplaceIndex.substr(0,cssPathReplaceIndex.lastIndexOf(":contains"));
    }

    var allPathAndElements = new Array();
    //取元素下的所有属性返回
    for(var i=0; i<nodes.length;i++){
        var nodeCssPath = (WebInspector.DOMPresentationUtils.cssPath).call(nodes[i],true,false,false);
        allPathAndElements.push({csspath:nodeCssPath,element:gatherElement(nodes[i])});
    }
    return WebInspector.DOMPresentationUtils.toJSON({
            "optimizedCssPath" : cssPathReplaceIndex,
            "text" : text,
            "optimizedCssPathNotReplaceIndex" : cssPath,
            "count": nodes.length,
            "allPathAndElements" : allPathAndElements
         });

        //获取节点下元素的属性信息
        function gatherElement(node){
            var attrObj = getAllAttribute(node);
            attrObj['tag'] = node.nodeName.toLowerCase();
            //文本内容，不超过10个字，并且将其清空
            var text = getText(node);
            if(text && text.length < 10){
                attrObj['outertext'] = text;
            }   
            return attrObj;

            function getAllAttribute(obj){
                //var gatherAttrs = ["id","name","type","class","value","title","href","alt"];
                var gatherAttrs = "id;name;type;class;value;title;href;alt;"; 
                var attrs = new Object();
                var attrObj = new Object();
                for(var p in obj){
                    if(p ==="attributes"){  
                        var attrs =  obj[p];      
                        for(var a in attrs){
                            if(attrs[a].name === undefined || attrs[a].value === undefined){
                                continue;
                            }
                            if(gatherAttrs.indexOf(attrs[a].name) > -1){
                                attrObj[attrs[a].name] = attrs[a].value;
                            }
                        }
                    }
                }
                return attrObj;
            }   
        }

    function getText(node){
        //如果是input type=button,submit,reset text取value
        if(!node) return "";
        var tagName = node.tagName.toLowerCase();
        if(!needMatchText(tagName))
            return "";

        var text =  node.textContent || node.outerText || '';
        return text.replace(/[\r\n\t]/g,"").replace(/(^\s*)|(\s*$)/g,"");
    }

    /***
     * 需要取文本的标签，嵌套标签的外层暂时不取
     */
    function needMatchText(tagName){
        return !/ul|table|tr/.test(tagName);
    }
}

/**
 * 优化cssPath
 * @param cssPath
 * @param iframesrc
 */
WebInspector.DOMPresentationUtils.optimizedCssPath =  function(cssPath,iframesrc){
    var target = WebInspector.DOMPresentationUtils.findTargetDocument(iframesrc);
    return (WebInspector.DOMPresentationUtils.optimizedCssPathOnWindow).call(window,cssPath,target);
}

/**
 * @param {string} cssPath
 */
WebInspector.DOMPresentationUtils.querySelector = function(cssPath,parentNode){
    parentNode = parentNode || document;
    //如果cssPath中有"contains要特别解析"
    if(/(:contains)/.test(cssPath)){   
        var elements = new Array();

        //提取要匹配的文本
        var text = cssPath.match(/:contains\(\"(.*?)\"\)/)[1];
        //var tagName = cssPath.match(/(\S+):contains/)[1];
        var index = cssPath.lastIndexOf(':contains');
        var parentEleCssPath = cssPath.substr(0,index);
        var childNodes = parentNode.querySelectorAll(parentEleCssPath);//循环处理chiledNodes,处理其nodes
        for(var i = 0;i<childNodes.length;i++){
            //text支持正则
            if(CsCodeInspect._stringRegMatch(getText(childNodes[i]), text)){
                elements.push(childNodes[i]);
            }
        }
        return elements;
    }
    return parentNode.querySelectorAll(cssPath);

    function getText(node){
        if(node){
            var text = node.textContent || node.outerText;
            return text.replace(/[\r\n\t]/g,"").replace(/(^\s*)|(\s*$)/g,"");
        }
        return "";
    }
}

/**
 * @param{string} cssPath
 */
WebInspector.DOMPresentationUtils.optimizedCssPathOnWindow = function(cssPath,parentNode,isNeedGetText = true){
    var _cObject = WebInspector.DOMPresentationUtils.querySelector(cssPath,parentNode);
    if(_cObject.length == 0) return "";

    //1、获取带id的cssPath
    var cssSelectorWithId = (WebInspector.DOMPresentationUtils.cssPath).call(_cObject[0],true,false,false);
    //替换index,检查数量是否唯一
    var cssSelectorWithIdNotIndex = cssSelectorWithId.replace(/:nth-child\(\d*\)/g,""); 
    var cssSelectorWithoutIndexNodes = WebInspector.DOMPresentationUtils.querySelector(cssSelectorWithIdNotIndex,parentNode);
    if(cssSelectorWithoutIndexNodes.length == 1) 
        /*return JSON.stringify({
            "optimizedCssPath" : cssSelectorWithIdNotIndex,
            "count" : 1,
            "allPathAndElements" : [{csspath:cssSelectorWithIdNotIndex,element:gatherElement(cssSelectorWithoutIndexNodes[0])}]   
        });*/
        return generateReturn(cssSelectorWithIdNotIndex,null,'',cssSelectorWithoutIndexNodes);

    //2、
    var tagName = prop(_cObject[0],"tagName");
    //2、表单元素的处理：input
    if(DoFormElement(tagName)){
        //type,name,class
        var attrSelection = "";
        var type = prop(_cObject[0],"type");
        var name = prop(_cObject[0],"name");
        //通过type,name来判断是否满足
        var cssPathWithoutIndex = cssSelectorWithId.replace(/:nth-child\(\d*\)/g,""); 
        if(type && "text" != type && cssPathWithoutIndex.indexOf(tagName+"[type=\""+type+"\"]") < 0 ){
            //属性中可能已有text
            attrSelection += "[type=\""+type+"\"]";
        }
        if(name && !/[0-9]/.test(name)){
            //如果name中有数字，不要
            attrSelection += "[name=\""+name+"\"]";
        }

        //针对button,submit,reset,加上value
        if(type == 'button' || type == 'submit' || type == 'reset'){
            var value = prop(_cObject[0],"value");
            if(value)
                value = value.replace(/[\r\n\t]/g,"").replace(/(^\s*)|(\s*$)/g,"");
            if(value && value.length < 10){
                attrSelection += "[value~=\""+value+"\"]";
            }     
        }
        
        cssPathWithoutIndex = cssPathWithoutIndex + attrSelection;
        var cssPathWithNameNodes = WebInspector.DOMPresentationUtils.querySelector(cssPathWithoutIndex,parentNode);
        if(attrSelection && cssPathWithNameNodes.length == 1)
            /*return JSON.stringify({
                "optimizedCssPath" : cssPathWithoutIndex,
                "count": 1,
                "allPathAndElements" : [{csspath:cssPathWithoutIndex,element:gatherElement(cssPathWithNameNodes[0])}] 
            });*/
            return generateReturn(cssPathWithoutIndex,null,'',cssPathWithNameNodes);
    }


    //5、判断nth-child，如果有多个，比对这些元素的cssPath,找出相同的nth-child,将其删除
    var childMatchsResultArray = nthChildResultArray(cssSelectorWithId);
    for(var i=0; i<cssSelectorWithoutIndexNodes.length;i++){
        var nodeCssPath = (WebInspector.DOMPresentationUtils.cssPath).call(cssSelectorWithoutIndexNodes[i],true,false,false);
        diffChildCssPath(childMatchsResultArray,nodeCssPath);
    }
    //做替换
    cssSelectorWithId = replaceSameNthChild(childMatchsResultArray,cssSelectorWithId);
    optimizedCssPathNotReplaceIndex = cssSelectorWithId;//保留去除前的值

    //有关文本：先去除最后一个nth-child  如果还是唯一，用替换最后一个的，否则最后一个也不替换。
    //有些控件文本匹配不准，比如tr,ul,table 不捕获
    var needText = '';
    var nodes;
    var isReturn = false;
    var optimizedCssPathNotReplaceIndex = '';
    var text = getText(_cObject[0]);//06-30增加如果text中含有数字，不取其值
    if(text && text.length < 10 && !/[0-9]/.test(text) && isNeedGetText){
        text = escapeExp(text);
        //有text需要返回,对正则中的特殊符号进行转义：
        //试试如果最后一个路径中含有nth-child去除后是否唯一
        var cssSelectorWithIdNotLastNthChild = replaceLastPathIfHasNthChild(cssSelectorWithId);
        var cssSelectorWithIdNotLastNthChildWithText = cssSelectorWithId + ":contains(\""+text+"\")";
        nodes = WebInspector.DOMPresentationUtils.querySelector(cssSelectorWithIdNotLastNthChildWithText,parentNode);
        if(nodes.length == 1){
            return generateReturn(cssSelectorWithIdNotLastNthChild,text,'',nodes);          
        }

        //否则，直接用cssSelectorWithId
        var cssSelectorWithText = cssSelectorWithId + ":contains(\""+text+"\")";
        nodes = WebInspector.DOMPresentationUtils.querySelector(cssSelectorWithText,parentNode);
        if(nodes.length == 1){
            return generateReturn(cssSelectorWithId,text,'',nodes);          
        }
    }

    /*//规则2：只有一个nth-child
        //分析：如果是最后一个nth-child,说明在同一层，有类似的控件。这种一般都是要录取唯一的。
        //其它层，检查文本是否一样，如果一样，说明是类似控件
    if(cssSelectorWithId.split(":nth-child").length == 2){
        var levels = cssSelectorWithId.split(">");
        if(levels[levels.length-1].indexOf(":nth-child") < 0 && text && text.length < 10){
            var cssSelectorNotIndex =  cssSelectorWithId.replace(/:nth-child\(\d*\)/,"");
            var nodes = WebInspector.DOMPresentationUtils.querySelector(cssSelectorNotIndex,parentNode);
            for(var i in nodes){
                
            }
        }
    }*/

    //规则3：有多个nth-child
        //除了最后一层的nth-child,检查结构是否都完全一样:完全一样，先去除最上面一个看看？--暂时去除，放在找相似元素处
    //cssSelectorWithId = replaceNthChildIfCan(cssSelectorWithId,childMatchsResultArray);


    return generateReturn(cssSelectorWithId,null,optimizedCssPathNotReplaceIndex,null);
    //返回
    /*return JSON.stringify({
            "optimizedCssPath" : cssSelectorWithId,
            "text" : needText,
            "optimizedCssPathNotReplaceIndex" : optimizedCssPathNotReplaceIndex,
            "count": nodes.length,
            "allPathAndElements" : allPathAndElements
         });*/
    
    /**
     * 生成返回值
     */
    function generateReturn(optimizedCssPath,text,cssPathNotReplaceIndex,nodes){
        //如果nodes为null,根据optimizedCssPath生成
        if(nodes == null){
            nodes = WebInspector.DOMPresentationUtils.querySelector(optimizedCssPath,parentNode);
        }
        var allPathAndElements = new Array();
        //取元素下的所有属性返回
        for(var i=0; i<nodes.length;i++){
            var nodeCssPath = (WebInspector.DOMPresentationUtils.cssPath).call(nodes[i],true,false,false);
            allPathAndElements.push({csspath:nodeCssPath,element:gatherElement(nodes[i])});
        }

        return WebInspector.DOMPresentationUtils.toJSON({
            "optimizedCssPath" : optimizedCssPath,
            "text" : text,
            "optimizedCssPathNotReplaceIndex" : cssPathNotReplaceIndex,
            "count": nodes.length,
            "allPathAndElements" : allPathAndElements
         });        
    }

    /**
     * 替换可以替换的nth:
     * 如果有多个，除了最后一个nth-child,如果其它的nth-child值都一样，替换掉（有没有风险？先这样，再观察）
     *  //经过观察后，如果全部去除，会出现奇怪的现状,去除第一个nth
     */
    function replaceNthChildIfCan(cssSelectorWithId,childMatchsResultArray){
        //只有一个
        var levels = cssSelectorWithId.split(">");        
        levels.reverse();
        var lastIndexId = -1;
        var hasReplaced = false; 
        for(var i = 0; i< levels.length; i++){
            if(i == 0 || levels[i].indexOf(':nth-child') < 0  || !isNeedReplaceNthChild(i))
                continue;

            //替换
            lastIndexId = i;
        }

        if(lastIndexId != -1){
            levels[lastIndexId] = levels[lastIndexId].replace(/:nth-child\(\d*\)/,"");
            hasReplaced = true;
        }
        //重新生成
        if(hasReplaced){
            cssSelectorWithId = "";
            for(var i=levels.length-1; i>=0; i--){
                cssSelectorWithId += levels[i];
                if(i > 0){
                    cssSelectorWithId += ">";
                }
            }
        }
        return cssSelectorWithId;

        function isNeedReplaceNthChild(indexId){
            for(var matchcResult of childMatchsResultArray){
                if(matchcResult.levelId == indexId)
                    return matchcResult.levelSame;
            }
            return false;
        }
    }

    /***
     * 需要取文本的标签，嵌套标签的外层暂时不取
     */
    function needMatchText(tagName){
        return !/ul|table|tr/.test(tagName);
    }

    /**
     * 转移正则中的特殊符号:()[].*?^${}\
     */
    function escapeExp(text){    
        return text.replace(/[\(\)\[\]\.\?\*\^\$\{\}\+\\]/g,"\\$&")
    }

    /**
     * 替换掉相同的nth-child，根据childMatchsResultArray中的匹配结果
     */
    function replaceSameNthChild(childMatchsResultArray,cssPath){
        var Nodelevels = cssPath.split(">");
        Nodelevels.reverse();

        var hasReplaced = false;
        for(var i = 0;i < childMatchsResultArray.length; i++){
             if(!childMatchsResultArray[i].allSame)
                continue;
             var replaceLevelId = childMatchsResultArray[i].levelId
             Nodelevels[replaceLevelId] = Nodelevels[replaceLevelId].replace(/:nth-child\(\d*\)/,""); 
             hasReplaced = true;
        }
        //重新生成
        if(hasReplaced){
            cssPath = "";
            for(var i=Nodelevels.length-1; i>=0; i--){
                cssPath += Nodelevels[i];
                if(i > 0){
                    cssPath += ">";
                }
            }
        }
        return cssPath;
    }


    /**
     * 最后一个元素如果含有nth-child，去除
     */
    function replaceLastPathIfHasNthChild(cssPath){
        var array = cssPath.split(">");
        var hasReplaced = false;
        //替换最后一个
        var index = array.length-1;
        if(array[index].indexOf(':nth-child') > -1){
            array[index] = array[index].replace(/:nth-child\(\d*\)/,""); 
            hasReplaced = true;
        }

        if(!hasReplaced) 
            return cssPath;
        
        return array.join('>');
    }

    //获取节点下元素的属性信息
    function gatherElement(node){
        var attrObj = getAllAttribute(node);
        attrObj['tag'] = node.nodeName.toLowerCase();
        //文本内容，不超过10个字，并且将其清空
        var text = getText(node);
        if(text && text.length < 10){
            attrObj['outertext'] = text;
        }   
        return attrObj;

        function getAllAttribute(obj){
            //var gatherAttrs = ["id","name","type","class","value","title","href","alt"];
            var gatherAttrs = "id;name;type;class;value;title;href;alt;"; 
            var attrs = new Object();
            var attrObj = new Object();
            for(var p in obj){
                if(p ==="attributes"){  
                    var attrs =  obj[p];      
                    for(var a in attrs){
                        if(attrs[a].name === undefined || attrs[a].value === undefined){
                            continue;
                        }
                        if(gatherAttrs.indexOf(attrs[a].name) > -1){
                            attrObj[attrs[a].name] = attrs[a].value;
                        }
                    }
                }
            }
            return attrObj;
        }   
    }

    /**
     * 比较cssPath与childMatchsResultArray中的nth-child位置与值是否相同，如果不同，要修正allSamePath值为false
     */
    function diffChildCssPath(childMatchsResultArray,cssPath){
        var Nodelevels = cssPath.split(">");
        Nodelevels.reverse();
        var hasSameChild = false;//是否要继续校验，即，是否有相同的元素
        for(var i = 0;i < childMatchsResultArray.length; i++){
            //如果已不相同，不用再比
            if(!childMatchsResultArray[i].allSame && !childMatchsResultArray[i].levelSame)
                continue;

            //检查i有无超出nodeLevel的长度
            if(childMatchsResultArray[i].levelId > Nodelevels.length - 1){
                childMatchsResultArray[i].allSame = false;
                childMatchsResultArray[i].levelSame = false;
                continue;
            }

            var levelNodePath = Nodelevels[childMatchsResultArray[i].levelId];
            //取tagName,nth-child值
            var indexArray = levelNodePath.match(/:nth-child\((\d+)\)/);
            //没有nth-child，也认为不一样
            if(!indexArray){
                childMatchsResultArray[i].allSame = false;
                childMatchsResultArray[i].levelSame = false;
                continue;
            }

            var tagName = levelNodePath.match(/(\S+):nth-child/)[1];
            if(indexArray[1] === childMatchsResultArray[i].childIndex && tagName === childMatchsResultArray[i].tagName){
                hasSameChild = true;
            }else{
                childMatchsResultArray[i].allSame = false;
            }

            //如果tagName不一样，认为level值不一样
            if(tagName != childMatchsResultArray[i].tagName)
                childMatchsResultArray[i].levelSame = false;
        }

        return hasSameChild;
    }

    /**
     * 从cssPath中提取出每个cssPath所在的位置，值，tagName
     * @param csspath
     * @returns 
     *  leveId  层次
     *  childIndex nth_child(?)值
     *  tagName 标签名称
     *  allSame nth-child(?)值是否都一样  levelId/childIndex同时相等
     *  levelSame 位置是否一样 levelId相等且有nth-child
     */
    function nthChildResultArray(cssPath){
        if(!cssPath) return "";
        var resultArray = [];

        var levels = cssPath.split(">")
        levels.reverse();
        for(var i = 0; i< levels.length; i++){
            //获取层、nth-child值
            var indexArray = levels[i].match(/:nth-child\((\d+)\)/);
            if(!indexArray) continue;
            var tagName = levels[i].match(/(\S+):nth-child/)[1];

            var o = {
                levelId : i,
                childIndex :  indexArray[1],
                tagName :   tagName,
                allSame : true,
                levelSame : true            
            }
            resultArray.push(o);
        }
        return resultArray;
    }

    function DoFormElement(tagName){
        return /(input)/.test(tagName);
    }

    function DoTextElement(tagName){
        return /button|li|a|span|p|div/.test(tagName);
    }

    function prop(node,name){
        if(!node) return "";
        switch(name){
            case "tagName":
                return node.localName || node.tagName.toLowerCase();
            case 'value':
                return node.value;
            case "id":
            case "type":
            case "name":
                return node.getAttribute(name);
        } 
    }

    function getText(node){
        //如果是input type=button,submit,reset text取value
        if(!node) return "";
        var tagName = node.tagName.toLowerCase();
        if(!needMatchText(tagName))
            return "";

        var text =  node.textContent || node.outerText || '';
        return text.replace(/[\r\n\t]/g,"").replace(/(^\s*)|(\s*$)/g,"");
    }

}

/**
 * @param {!WebInspector.DOMNode} node
 * @param {boolean=} optimized 优化，是否找到id就返回
 * @param {boolean-} allPath 是否取全路径，如果是，将不用id,class
 * @param {boolean-} needClass,allPath=false,needClass=true的情况下，才将class属性生成到selector中
 * @return {string}
 */
WebInspector.DOMPresentationUtils.cssPath = function (optimized, allPath , needClass) {
    WebInspector.DOMPresentationUtils.initNodeType();
    var node = this;
    if (node.nodeType !== Node.ELEMENT_NODE)
        return "";
    var steps = [];
    var contextNode = node;
    while (contextNode) {
        var step = WebInspector.DOMPresentationUtils._cssPathStep(contextNode, !!optimized, contextNode === node, allPath, needClass);
        if (!step)
            break; // Error - bail out early.
        steps.push(step);
        if (step.optimized)
            break;
        contextNode = contextNode.parentNode;
    }
    steps.reverse();
    return steps.join(" > ");
}

/**
 * 有些页面无Node.对象
 */
WebInspector.DOMPresentationUtils.initNodeType = function(){
    try {
        if (Node.ELEMENT_NODE != 1) {
            throw true;
        }
    }
    catch(e) {
        document.Node = Node || {};
        Node.ELEMENT_NODE   = 1;
        Node.ATTRIBUTE_NODE = 2;
        Node.TEXT_NODE      = 3;
        Node.CDATA_SECTION_NODE = 4;
        Node.PROCESSING_INSTRUCTION_NODE = 7;
        Node.COMMENT_NODE = 8;
        Node.DOCUMENT_NODE = 9;
    }    
}

/**
 * @param {!WebInspector.DOMNode} node
 * @param {boolean} optimized 
 * @param {boolean} isTargetNode 
 * @return {?WebInspector.DOMNodePathStep}
 */
WebInspector.DOMPresentationUtils._cssPathStep = function (node, optimized, isTargetNode, allPath, needClass) {
    if (node.nodeType !== Node.ELEMENT_NODE)
        return null;
    var id = node.getAttribute("id");
    if (/^(?:[0-9]|-[0-9-]?)|([0-9])$/.test(id) || !isCSSIdentifier(id)) {
        id = null;
    }
    var nodeName = nodeNameInCorrectCase(node);
    if (optimized) {
        if (id && !allPath){
            return new WebInspector.DOMNodePathStep(nodeName + idSelector(id), true);
        }
        var nodeNameLower = node.nodeName.toLowerCase();
        if (nodeNameLower === "body" || nodeNameLower === "head" || nodeNameLower === "html")
            return new WebInspector.DOMNodePathStep(nodeNameInCorrectCase(node), true);
    }
    if (id && !allPath)
        return new WebInspector.DOMNodePathStep(nodeName + idSelector(id), true);
    var parent = node.parentNode;
    if (!parent || parent.nodeType === Node.DOCUMENT_NODE)
        return new WebInspector.DOMNodePathStep(nodeName, true);
    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Array.<string>}
     */
    function prefixedElementClassNames(node) {
        var classAttribute = node.getAttribute("class");
        if (!classAttribute)
            return [];
        return classAttribute.split(/\s+/g).filter(Boolean).map(function (name) {
            // The prefix is required to store "__proto__" in a object-based map.
            return "$" + name;
        });
    }

    function nodeNameInCorrectCase(node) {
        var shadowRootType = node.shadowRootType;
        if (shadowRootType)
            return "#shadow-root (" + shadowRootType + ")";
        return isXMLNode(node) ? node.nodeName : node.nodeName.toLowerCase();
    }

    function isXMLNode(node) {
        return !!node.ownerDocument && !!node.ownerDocument.xmlVersion;
    }

    /**
     * @param {string} id
     * @return {string}
     */
    function idSelector(id) {
        //return "#" + escapeIdentifierIfNeeded(id);
        return "#" + id;;
    }
    /**
     * @param {string} ident
     * @return {string}
     */
    function escapeIdentifierIfNeeded(ident) {
        if (isCSSIdentifier(ident))
            return ident;
        var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident);
        var lastIndex = ident.length - 1;
        return ident.replace(/./g, function (c, i) {
            return ((shouldEscapeFirst && i === 0) || !isCSSIdentChar(c)) ? escapeAsciiChar(c, i === lastIndex) : c;
        });
    }
    /**
     * @param {string} c
     * @param {boolean} isLast
     * @return {string}
     */
    function escapeAsciiChar(c, isLast) {
        return "\\" + toHexByte(c) + (isLast ? "" : " ");
    }
    /**
     * @param {string} c
     */
    function toHexByte(c) {
        var hexByte = c.charCodeAt(0).toString(16);
        if (hexByte.length === 1)
            hexByte = "0" + hexByte;
        return hexByte;
    }
    /**
     * @param {string} c
     * @return {boolean}
     */
    function isCSSIdentChar(c) {
        if (/[a-zA-Z0-9_-]/.test(c))
            return true;
        return c.charCodeAt(0) >= 0xA0;
    }
    /**
     * @param {string} value
     * @return {boolean}
     */
    function isCSSIdentifier(value) {
        return /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value);
    }
    var prefixedOwnClassNamesArray = prefixedElementClassNames(node);
    var needsClassNames = false;
    var needsNthChild = false;
    var ownIndex = -1;
    var elementIndex = -1;
    var siblings = parent.children;
    for (var i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
        var sibling = siblings[i];
        if (sibling.nodeType !== Node.ELEMENT_NODE)
            continue;
        elementIndex += 1;
        if (sibling === node) {
            ownIndex = elementIndex;
            continue;
        }
        if (needsNthChild)
            continue;
        if (nodeNameInCorrectCase(sibling) !== nodeName)
            continue;
        needsClassNames = true;
        var ownClassNames = "";//= prefixedOwnClassNamesArray.keySet();暂时不用class,后续再调
        var ownClassNameCount = 0;
        if(!allPath && needClass){
            for (var name in ownClassNames)
                ++ownClassNameCount;
        }
        if (ownClassNameCount === 0) {
            needsNthChild = true;
            continue;
        }
        var siblingClassNamesArray = prefixedElementClassNames(sibling);
        for (var j = 0; j < siblingClassNamesArray.length; ++j) {
            var siblingClass = siblingClassNamesArray[j];
            if (!ownClassNames.hasOwnProperty(siblingClass))
                continue;
            delete ownClassNames[siblingClass];
            if (!--ownClassNameCount) {
                needsNthChild = true;
                break;
            }
        }
    }
    var result = nodeName;
    if (isTargetNode && nodeName.toLowerCase() === "input" && node.getAttribute("type") && !node.getAttribute("id") && !node.getAttribute("class"))
        result += "[type=\"" + node.getAttribute("type") + "\"]";
    if (needsNthChild) {
        result += ":nth-child(" + (ownIndex + 1) + ")";
    } else if (needsClassNames) {
        for (var prefixedName in prefixedOwnClassNamesArray.keySet())
            result += "." + escapeIdentifierIfNeeded(prefixedName.substr(1));
    }
    return new WebInspector.DOMNodePathStep(result, false);

   /*** Array.prototype.keySet = function() {}
    Object.defineProperty(Array.prototype, "keySet",
    {
        value: function()
        {
            var keys = {};
            for (var i = 0; i < this.length; ++i)
                keys[this[i]] = true;
            return keys;
        }
    });**/
}
/**
 * @param {!WebInspector.DOMNode} node
 * @param {boolean=} optimized
 * @return {string}
 */
WebInspector.DOMPresentationUtils.xPath = function (optimized, allPath) {
    var node = this;
    if (node.nodeType === Node.DOCUMENT_NODE)
        return "/";
    var steps = [];
    var contextNode = node;
    while (contextNode) {
        var step = WebInspector.DOMPresentationUtils._xPathValue(contextNode, optimized, allPath);
        if (!step)
            break; // Error - bail out early.
        steps.push(step);
        if (step.optimized)
            break;
        contextNode = contextNode.parentNode;
    }
    steps.reverse();
    return (steps.length && steps[0].optimized ? "" : "/") + steps.join("/");
}
/**
 * @param {!WebInspector.DOMNode} node
 * @param {boolean=} optimized
 * @return {?WebInspector.DOMNodePathStep}
 */
WebInspector.DOMPresentationUtils._xPathValue = function (node, optimized, allPath) {
    var ownValue;
    var ownIndex = WebInspector.DOMPresentationUtils._xPathIndex(node);
    if (ownIndex === -1)
        return null; // Error.
    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            if (optimized && node.getAttribute("id") && !allPath && !/^(?:[0-9]|-[0-9-]?)/.test(node.getAttribute("id")))
                return new WebInspector.DOMNodePathStep("//*[@id=\"" + node.getAttribute("id") + "\"]", true);
            ownValue = node.localName;
            break;
        case Node.ATTRIBUTE_NODE:
            ownValue = "@" + node.nodeName;
            break;
        case Node.TEXT_NODE:
        case Node.CDATA_SECTION_NODE:
            ownValue = "text()";
            break;
        case Node.PROCESSING_INSTRUCTION_NODE:
            ownValue = "processing-instruction()";
            break;
        case Node.COMMENT_NODE:
            ownValue = "comment()";
            break;
        case Node.DOCUMENT_NODE:
            ownValue = "";
            break;
        default:
            ownValue = "";
            break;
    }
    if (ownIndex > 0)
        ownValue += "[" + ownIndex + "]";
    return new WebInspector.DOMNodePathStep(ownValue, node.nodeType === Node.DOCUMENT_NODE);
}
/**
 * @param {!WebInspector.DOMNode} node
 * @return {number}
 */
WebInspector.DOMPresentationUtils._xPathIndex = function (node) {
    // Returns -1 in case of error, 0 if no siblings matching the same expression, <XPath index among the same expression-matching sibling nodes> otherwise.
    function areNodesSimilar(left, right) {
        if (left === right)
            return true;
        if (left.nodeType === Node.ELEMENT_NODE && right.nodeType === Node.ELEMENT_NODE)
            return left.localName === right.localName;
        if (left.nodeType === right.nodeType)
            return true;
        // XPath treats CDATA as text nodes.
        var leftType = left.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType;
        var rightType = right.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType;
        return leftType === rightType;
    }
    var siblings = node.parentNode ? node.parentNode.children : null;
    if (!siblings)
        return 0; // Root node - no siblings.
    var hasSameNamedElements;
    for (var i = 0; i < siblings.length; ++i) {
        if (areNodesSimilar(node, siblings[i]) && siblings[i] !== node) {
            hasSameNamedElements = true;
            break;
        }
    }
    if (!hasSameNamedElements)
        return 0;
    var ownIndex = 1; // XPath indices start with 1.
    for (var i = 0; i < siblings.length; ++i) {
        if (areNodesSimilar(node, siblings[i])) {
            if (siblings[i] === node)
                return ownIndex;
            ++ownIndex;
        }
    }
    return -1; // An error occurred: |node| not found in parent's children.
}
/**
 * @constructor
 * @param {string} value
 * @param {boolean} optimized
 */
WebInspector.DOMNodePathStep = function (value, optimized) {
    this.value = value;
    this.optimized = optimized || false;
}
WebInspector.DOMNodePathStep.prototype = {
    /**
     * @override
     * @return {string}
     */
    toString: function () {
        return this.value;
    }
};

//一些Dom的公共方法
(function(f){
    f.DomUtil = {
        findTagName : function(str){
            if(str.indexOf(':nth-child') > -1){
                tagName = str.match(/(\S+):nth-child/)[1];
            }else{
                tagName = str.match(/(\S+)/)[1];
            }
            return tagName
        },

        findNthChild : function(str){
            if(str.indexOf(':nth-child') > -1){
                return str.match(/:nth-child\((\d+)\)/)[1]
            }
            return '';
        },

        /**
         * 移除nth-child的值
         */
        removeNthChild : function(str){
            return str.replace(/:nth-child\(\d*\)/,"")
        },

        /**
         * 找出某个nodePath的全路径
         */
        findAllSelectorPath : function(nodePath,targetNode){
            //先判断nodePath有几个元素
            let nodes = WebInspector.DOMPresentationUtils.querySelector(nodePath,targetNode);
            if(nodes.length == 0) return nodePath;

            let allPath = (WebInspector.DOMPresentationUtils.cssPath).call(nodes[0],false,true,false);
            //算出来后，再跟nodePath合起来
            if(nodes.length == 1) 
                return allPath;
            
            //算一下差：从后面开始比，当allPath的tagname和nodePath相同，但allPath有nth-child，要删除
            let nodePathArray = nodePath.split('>').reverse();
            let allPathArray = allPath.split('>').reverse();
            //从nodePathArray算
            for(let i= 0; i<nodePathArray.length; i++){
                let theAllPath = allPathArray[i];
                if(nodePathArray[i] == theAllPath){
                    continue;
                }
                let tagName1 = this.findTagName(nodePathArray[i]);
                let tagName2 = this.findTagName(theAllPath);
                if(tagName1 != tagName2){
                    break;
                }

                //如果theAllPath有nth-child但 nodePath没有，去除
                if(theAllPath.indexOf(':nth-child') > -1 && nodePathArray[i].indexOf(':nth-child') < 0){
                     allPathArray[i] = this.removeNthChild(theAllPath);
                }
            }

            return allPathArray.reverse().join('>');
        },

        /**
         * 找公共的部分:包括完全一样的部分 + tagName一样，但nth-child不同的部分。
         * 比如  div:nth-child(1) > div > div > div > div:nth-child(1) > div > p
         *       div:nth-child(1) > div > div:nth-child(1) > div > div:nth-child(1) > div > span
         * --找出来的相同的部分:div:nth-child(1) > div 
         * --差异部分：div:nth-child(1) > div > div:nth-child(1) > div
         * --最终要整合成这样一个：div > div > div:nth-child(1) > div > div:nth-child(1) > div
         * {
         *     same:   div:nth-child(1) > div 
         *     patheNotWithNth : div > div:nth-child(1) > div
         * }
         */
        findCommonPath : function(nodePath1,nodePath2,target){
            let diffPathArray = new Array();
            //如果nodePath1有多个，只取一个
            let nodes = WebInspector.DOMPresentationUtils.querySelector(nodePath1,target);
            let subNodePath1 = nodePath1;
            let subNodePath2 = nodePath1;
            if(nodes.length > 1){
                subNodePath1 = (WebInspector.DOMPresentationUtils.cssPath).call(nodes[0],false,true,false);
                subNodePath2 = (WebInspector.DOMPresentationUtils.cssPath).call(nodes[1],false,true,false);
                //注意:nodePath1与subNodePath1的区别在于，subnodePath会双nodePath1多一些nth-child
            }
            
            let nodePathArray1 = nodePath1.split('>');
            let subNodePathArray1 = subNodePath1.split('>');
            let subNodePathArray2 = subNodePath2.split('>');
            let nodePathArray2 = nodePath2.split('>');
            //取长度短的遍历
            let maxCount = nodePathArray1.length > nodePathArray2.count ? nodePathArray2.count : nodePathArray1.length;
            let samePathArray = new Array();
            for(let j=0;j< maxCount;j++){
                //1、tagName一样
                //2、nth-child 若其中有一个有，取没有nth-child的，否则认为不相同
                //相同的用nodePathArray1来比较
                if(nodePathArray1[j] == nodePathArray2[j]){
                    if(diffPathArray.length == 0)
                        samePathArray.push(nodePathArray1[j]);
                    else
                        diffPathArray.push(nodePathArray1[j]);
                    continue;
                }

                //tagName是否相同
                if(this.findTagName(nodePathArray1[j]) == this.findTagName(nodePathArray2[j])){
                    let nc1 = this.findNthChild(nodePathArray1[j]);
                    let nc2 = this.findNthChild(nodePathArray2[j]);
                    let sub1 = this.findNthChild(subNodePathArray1[j]);
                    let sub2 = this.findNthChild(subNodePathArray2[j]);
                    //当sub1值与sub2值相同时，所以这里一个固定的值,如果此时，nth-child值与nc2不同，就认为不是相同元素了，要跳出。
                    //当sub1值与sub2值不同时，说明这个nth-child是浮动的,可以不用考虑的。认为可以是相同的元素
                    //当sub没有值时，要用nc2的值。
                    //当nc2没有值呢？nc1有值，一般应该不会出现，如果出现呢？加上nc1值
                    if(nc2 && sub1 && sub2 && sub1 == sub2 && sub1 != nc2)
                        break;//nth-child不同
                    
                    //有几种情况：nc1Main与nc2至少有一个没有值,
                     //1、如果nc1Main没有值，
                     //2、nc1无值，nc2有值 
                    if(nc1){
                        diffPathArray.push(nodePathArray1[j]);
                    }else{
                        diffPathArray.push(nodePathArray2[j]);
                    }
                    continue;
                }
                break;
            }


            return {
                samePath : samePathArray.join('>'),
                differPath : diffPathArray.join('>')
            };
        },

        /**
         * 判断一个路径是否以html开头，如果不是，要补一下
         */
        addHtmlPrefix : function(path){
            if(path.substr(0,4) != 'html'){
                return 'html > ' + path;  
            }
            return path;
        },

        /**
         * 
         */
        optimizeSubElementsPath : function(parentAllPath,parentOptimizePath,subElementArray){
            parentAllPath = this.addHtmlPrefix(parentAllPath);
            let prefixLength = parentAllPath.split(">").length;
            let optimizePathArray = [];
            for(let i =0;i<subElementArray.length;i++){
                let subPath = this.addHtmlPrefix(subElementArray[i]);
                let pathArray = subPath.split(">");
                pathArray = pathArray.slice(prefixLength,pathArray.length+1);
                //optimizePathArray[i] = parentOptimizePath + " >" + pathArray.join('>');
                optimizePathArray.push({optimizedCssPath:parentOptimizePath + " >" + pathArray.join('>')});
            }
            return optimizePathArray;
        },

        /**
         * 去除没用的nth-child
         */
         removeUnlessNthChild :function(nodePath,target){
            if(nodePath && nodePath.indexOf("nth-child") < 0) return nodePath;
            let largeChildNodePath = nodePath;
            while(largeChildNodePath.indexOf("nth-child") > -1){
                //去除一个
                let path = largeChildNodePath.replace(/:nth-child\(\d*\)/,"");
                if(WebInspector.DOMPresentationUtils.querySelector(path,target).length > 1){
                    break;
                }
                largeChildNodePath = path;
            }
            return largeChildNodePath;
        },

        /**
         * 优化
         */
        findParentSimilarElementPath : function(samePath,differPath,childPathArray,target){
            let similarParentPaths = new Array();//return
            let similarParentPathWithCount = new Array();//找相似时，记下相似的元素，后面做个倒序

            //第一步，从第一层尽可能的替换掉没用的nth-child
            differPath = this.removeUnlessNthChild(differPath,target);
            let samePathArray = samePath.split('>');
            let differPathArray = differPath.split('>');

            if(differPath.indexOf('nth-child') < 0){
                if(differPath){
                    samePathArray = samePathArray.concat(differPathArray);
                }
                similarParentPaths.push(samePathArray.join('>'));
                return similarParentPaths;
            }

            //largeChildNodePath
            //第二步，对differ的nth-child排列组合。
            //1、获取largeChildNodePath中所有nth-child的位置及值
            let nthChildIndexAndVArray = f.DomUtil.findNthChildIndexAndValue(differPathArray);
            //2、对nthChildIndexAndVArray排列组合
            let nthChildCombinaArray = this.getCombinations(nthChildIndexAndVArray);
            //nthChildCombinaArray上加上元素本身，不去除任何元素
            nthChildCombinaArray = [''].concat(nthChildCombinaArray);

            //3、对每种组合，分别check：有多种结果，要不要记录，用于下次使用，先不优化。TODO
            for(let c of nthChildCombinaArray){
                //根据c中的值，取出替换后的nodePath.
                let replaceArray = differPath.split('>');
                let cPath = samePath + '> '+ this.replaceCombinaNthChild(c,replaceArray);
                //校验cPath是否符合。
                let {totalCount,visualCount} =  this.getSimilarElementCount(cPath,childPathArray,target);
                if(totalCount == 0)
                    continue;

                let result = f.DomUtil.checkLargerSelectorWithSub(cPath,totalCount,similarParentPathWithCount,childPathArray.count,visualCount);
                switch(result){
                    case 2:
                        continue;
                    case 1:
                        similarParentPaths.push(cPath);
                        similarParentPathWithCount.push({optimizedCssPath:cPath,count:totalCount,visualCount:visualCount,orderCount:totalCount});
                        break;
                    case 3:
                        similarParentPaths.push(cPath);
                        similarParentPathWithCount.push({optimizedCssPath:cPath,count:totalCount,visualCount:visualCount,orderCount:0});
                        break;
                }
            }

            //如果有多，要根据count倒排
            if(similarParentPathWithCount.length >  1){
                similarParentPathWithCount.sort((a,b)=>{
                    return b.orderCount - a.orderCount;
                });

                //重新生成similarParentPaths
                similarParentPaths = new Array();
                for(let v of similarParentPathWithCount){
                    similarParentPaths.push(v.optimizedCssPath);
                }
            } 
            return similarParentPaths;
        },


        /**
         * 找parentPath下，满足有childArray的元素个数，childArray中的每一个元素至少在nodes中有一个同时存在。
         */
        getSimilarElementCount : function(parentPath,childArray,target){
            let totalCount = 0;//满足条件的节点
            let visualCount = 0;//可见的节点数量

            let nodes = WebInspector.DOMPresentationUtils.querySelector(parentPath,target);
            //如果元素只有一个，也不考虑
            if(nodes && nodes.length == 1){
                return {totalCount,visualCount};
            }

            //如果有多个，至少有2个认为满足
            let allChildMatched = false;
            for(let node of nodes){
                if(checkExistElement(node,childArray)){
                   totalCount++;
                    //node是否可见
                    let display = getComputedStyle(node)["display"]
                    if(display && display != 'none')
                        visualCount++;
                }
            }   

            if(totalCount < 2){
                totalCount = 0;

                return {totalCount,visualCount};
            }

            //如果不是所有的node都找到，也不能返回true
            if(!allChildMatched)
                totalCount = 0;

            return {totalCount,visualCount};

            function checkExistElement(node,childArray){
                let matched = false;
                //同时存在的个数：
                let matchedCount = 0;
                for(let i=0;i<childArray.length;i++){
                    let element = childArray[i];
                    let elementNodes = WebInspector.DOMPresentationUtils.querySelector(element,node);
                    if(elementNodes && elementNodes.length > 0){
                        matched = true;
                        if(allChildMatched) 
                            return true;
                        matchedCount++;
                    }
                }

                //找到一个 可以采集到所有节点的元素了
                if(matchedCount == childArray.length)
                    allChildMatched = true;

                return matched;
            }
        },

    /**
     * 判断cPath是否只是一个更大的选择器范围，这种情况下不加入
     * ;这里判断要不要更大的满园的选择器时，没有更好的判断条件，就根据子元素的个数，如果有多个子元素，如果有多个子元素且更大选择器个数更多，就算上
     * 2017-07-17：
     *    返回3种值：1 不存在  2、存在不要加入 3、存在要加入但不参与排序。
     */
     checkLargerSelectorWithSub :function(subPath,count,selectorArray,childCount,visualCount){
        if(selectorArray.length == 0) return 1;
        let cPathIndexAndArray = this.findNthChildIndexAndValue(subPath.split('>'));
        //只要找到一个，就返回true
        for(let pathObj of selectorArray){
            //判断path中的nth-child数量
            let PathIndexAndArray = this.findNthChildIndexAndValue(pathObj.optimizedCssPath.split('>'));
            //比较cPathIndexAndArray与PathIndexAndArray
            if(PathIndexAndArray.length <= cPathIndexAndArray.length){
                continue;
            }
            //比较值，cPathIndexAndArray中的值，是否在cPathIndexAndArray中存在，如果有不存在，不满足
            let isNthChildExist = true;
            for(let indexAndValue of cPathIndexAndArray){
                //取#前面的数字，即nth-child出现的位置,直接看整体值就可以了
                //let value = indexAndValue.match(/(\d+)#/)[1];
                if(PathIndexAndArray.indexOf(indexAndValue) == -1){
                    isNthChildExist = false;
                    break;
                }
            }

            //路径包含，如果大路径中的元素个数》原来的，也加, 经过试验，不能加数量，否则出现的结果组合太多，而且很多不是想要的
            /*if(isNthChildExist){
                if(count == 1 || count <= pathObj.count)
                    return true;
            }*/
            //if(isNthChildExist && count <= pathObj.count) return true; 

            //这里很难决定，还没有一个好的方法：现在是如果此时的subPath中还有nth-child，且count比pathObj.count大很多，很多是多少？2倍？ 就认为这个是需要的
            if(isNthChildExist){
                //这里比较的都是能看到值的数量,但是显示放在后面，不参与排序
                if(childCount == 1 && count > pathObj.count &&  visualCount > pathObj.visualCount){
                    return 3;
                }
                return 2;
            }

            //if(isNthChildExist) return true; 
        }
        return 1;
    },


        /**
     * 找出所有的nth-child的index与值，用#连接
     */
    findNthChildIndexAndValue :function(pathArray){
        let nthChildIndexAndVArray = [];
        for(let i=0;i<pathArray.length;i++){
            if(pathArray[i].indexOf('nth-child') < 0)
                continue;
            //获取index值
            let v = pathArray[i].match(/:nth-child\((\d+)\)/)
            nthChildIndexAndVArray.push(i + '#' + v);
        }
        return nthChildIndexAndVArray;
    },

        /**
     * 对数组中的元素进行组合：  console.log(getCombinations(["5", "2", "10","11"]));
     * result:["5", "5^2", "5^2^10", "5^2^10^11", "5^2^11", "5^10", "5^10^11", "5^11", "2", "2^10", "2^10^11", "2^11", "10", "10^11", "11"]
     */
    getCombinations : function(chars) {
        var result = [];
        var f = function(prefix, chars) {
        for (var i = 0; i < chars.length; i++) {
            var v = chars[i];
            if(prefix){
            v = prefix + '^'+ v;
            }
            result.push(v); 
            f(v, chars.slice(i + 1));
        }
        }
        f('', chars);

        //排个序
        result.sort((a,b)=>{
             return a.length - b.length;
        })
        return result;
    },

        /**
     * 获取替换后nth-child值的路径名
     * replaceStr example : 1#3^2#10
     */
    replaceCombinaNthChild(replaceStr,pathArray){
        if(replaceStr.indexOf('#') >-1){
            let replaceArray = replaceStr.split('^');
            for(let v of replaceArray){
                let array = v.split('#');
                pathArray[array[0]] = pathArray[array[0]].replace(/:nth-child\(\d*\)/,"");
            }
        }

        return pathArray.join('>');
    },


    }
})(window.WebInspector);

/**
 * 找元素
 */
(function(f){
    f.ExtractData = {
        /**
         * 区别于findSimilarElements的另一种找到思路，基于上一个elementPaths上，结合newElementPath，后面再取舍
         */
        findSimilarElementWhenAddOne : function(elementPaths,iframeInfo,nodePath){
            if(!elementPaths)
                return f.ExtractData.findSimilarElementsForSingle(nodePath,iframeInfo);
            //解析elementPaths:获取parentPath,childPath
            let dataObj = JSON.parse(elementPaths);
            let parentPath = dataObj.ParentPath;
            let childPaths = dataObj.ChildNodes;
            if(!parentPath && childPaths.length == 0){
                return f.ExtractData.findSimilarElementsForSingle(nodePath,iframeInfo);
            }

            let {optimizePath,text,allPath} = JSON.parse(nodePath);
            newElementPath = allPath;
            let parentNode = WebInspector.DOMPresentationUtils.findTargetDocument(iframeInfo);
            let retElements = new Array();//返回值

            //第一步：找最近的父元素：
            if(!parentPath)
                parentPath = childPaths[0].optimizedCssPath;
            // 比如parentPath、newElementPath
            //思路：1.1、算出parentPath的全路径：找出parentPath每一个元素，取其全路径
            //     1.2、根据parentPath,newElementPath处出最近的父元素
            let parentAllPath = f.DomUtil.findAllSelectorPath(parentPath,parentNode);
            let {samePath,differPath} = f.DomUtil.findCommonPath(parentAllPath,newElementPath,parentNode);

            if(!samePath) return -1;

            //第二步：找父的相似元素：因为要检验子元素，先获取所有要校验的子元素列表
            //2.1、组织子元素列表：原+新
            let childElementArray = new Array();
            if(childPaths.length == 0){
                //原来没有父，这种情况比较特别，可能出现两种情况：
                //情况一、新录制的元素与原parentPath也是同一组：那么新产生的recentParentPath应该是与原来的parentPath一样的。
                if(samePath == parentPath){
                   return WebInspector.DOMPresentationUtils.toJSON(elementPaths);
                }
                //情况二、新录制的元素是另一组，用parentPath当第一组元素
                childElementArray.push(parentAllPath);
                childElementArray.push(newElementPath);
            }else{
                for(let path of childPaths){
                    childElementArray.push(f.DomUtil.findAllSelectorPath(path.optimizedCssPath,parentNode));
                }
                childElementArray.push(newElementPath);
            }

            //2.2、算相似元素
            let similarParentPathArray = f.DomUtil.findParentSimilarElementPath(samePath,differPath,childElementArray,parentNode);

            //第二步：优化父+子路径
            for(let i = 0;i< similarParentPathArray.length;i++){
                let optimizeparentPath = optimizeParentPath(parentNode,similarParentPathArray[i]);
                let optimizeElementPathArray = f.DomUtil.optimizeSubElementsPath(similarParentPathArray[i],optimizeparentPath,childElementArray);
                retElements.push({
                    parentPath : optimizeparentPath,
                    childPaths : optimizeElementPathArray
                });
            }

            return WebInspector.DOMPresentationUtils.toJSON(retElements);
        },

        /**
         * 针对只有一个元素的情况，传入的是优化后路径
         */
        findSimilarElementsForSingle : function(nodePath,iframeInfo){
            if(!nodePath) return null;
            let {optimizePath,text,allPath} = JSON.parse(nodePath);
            var target = WebInspector.DOMPresentationUtils.findTargetDocument(iframeInfo);
            let similarPaths = new Array();
            
            if(optimizePath.indexOf(':nth-child') < 0){
                similarPaths.push({optimizedCssPath:optimizePath,text:text});    
            }else{
                doFind(optimizePath);

                //如果现在有text,再增加一个去除文件的优化器
                if(text){
                    let nodePathWithoutText = (WebInspector.DOMPresentationUtils.optimizedCssPathOnWindow).call(window,allPath,target,false);
                    if(nodePathWithoutText){
                        optimizePathWithoutText = JSON.parse(nodePathWithoutText).optimizedCssPath;
                        text = '';
                        doFind(optimizePathWithoutText);
                    }
                }

                //排序
                similarPaths.sort((a,b)=>{
                    return b.orderCount - a.orderCount;
                });
            }

            let reElearray = new Array();
            for(let path of similarPaths){
                reElearray.push({
                    parentPath : '',
                    childPaths : [path]});
            }
            return WebInspector.DOMPresentationUtils.toJSON(reElearray);
            
            function doFind(targetPath){
                //替换optimizePath的nth-child
                let childNodePathArray = targetPath.split(">");
                let nthChildIndexAndVArray = f.DomUtil.findNthChildIndexAndValue(childNodePathArray);
                //2、对nthChildIndexAndVArray排列组合
                let nthChildCombinaArray = f.DomUtil.getCombinations(nthChildIndexAndVArray);
                //3、对每种组合，分别check,希望找的是从内向外找，所以这里策略要改一下，TODO 取数组时倒着取。
                for(let c of nthChildCombinaArray){
                    let cPath = f.DomUtil.replaceCombinaNthChild(c,targetPath.split(">"));
                    let queryPath = cPath;
                    if(text){
                        queryPath += `:contains("${text}")`;
                    }
                    let nodes = WebInspector.DOMPresentationUtils.querySelector(queryPath,target);
                    if(nodes.length == 0)
                        return;

                    let visualCount = 0;
                    for(let node of nodes){
                        let display = getComputedStyle(node)["display"]
                        if(display && display != 'none')
                            visualCount++;
                    }
                    let result = f.DomUtil.checkLargerSelectorWithSub(queryPath,nodes.length,similarPaths,1,visualCount);
                    switch(result){
                        case 2:
                            return;
                        case 1:
                            similarPaths.push({optimizedCssPath:cPath,text:text,count:nodes.length,visualCount:visualCount,orderCount:nodes.length});  
                            break;
                        case 3:
                            similarPaths.push({optimizedCssPath:cPath,text:text,count:nodes.length,visualCount:visualCount,orderCount:0});  
                            break;
                    }
                }
            }

        }
    };



    /**
     * 优化父路径：
     */
    function optimizeParentPath(targetDoc,parentPath){
        var parentPathArray = parentPath.split('>');
        for(let i = parentPathArray.length; i > 0; i--){
            let thePath = parentPathArray.slice(0,i).join('>');
            var nodes = WebInspector.DOMPresentationUtils.querySelector(thePath,targetDoc);
            if(nodes.length == 1){
                let pathWithId = (WebInspector.DOMPresentationUtils.cssPath).call(nodes[0],true,false,false);
                if(i < parentPathArray.length){
                    pathWithId += ' >' + parentPathArray.slice(i,parentPathArray.length).join('>')
                }
                return pathWithId;
            }
        }
        return parentPath;
    }

})(window.WebInspector);


