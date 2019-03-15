window.CsCodeInspect = {
    _selectorMatch : false,
    _highlightNodes : new Array(),//所有高亮的元素--另一种方案
    _iframeSrc : null,//iframeSrc
    _highlightIsDone : true,
    _emptyStr: function(str) {
        return str == null || str == "" || str == undefined
    },

    _trim: function(str) {
        return str == null ? null : str.replace(/(^\s*)|(\s*$)/g, "");
    },

    _converSpecialStr: function(str) {
        if (!CsCodeInspect._emptyStr) {
            str = str.replace(/\t/, "    ")
        }
        return str;
    },

    //是否匹配正则
    _stringRegMatch: function(str, regStr) {
        if (CsCodeInspect._emptyStr(str) || CsCodeInspect._emptyStr(regStr)) {
            return false;
        }

        var pattern = new RegExp(regStr);
        return pattern.test(str);
    },

    /**
		base64加密函数
	**/
    _base64Encode: function(input) {
        var rv;
        rv = encodeURIComponent(input);
        rv = unescape(rv);
        rv = window.btoa(rv);
        return rv;
    },

    /**
		base64解密函数
	**/
    _base64Decode: function(input) {
        rv = window.atob(input);
        rv = escape(rv);
        rv = decodeURIComponent(rv);
        return rv;
    },

    //todo 加密成16进制
    _stringToHex: function(str) {

    },

    /**
     **/
    _hexToString: function(hexStr) {

    },

    /**
	  获取元素eleObj下元素tag=tagname的所有元素
	**/
    _getTagNameCollection(eleObj, tagName) {
        if (eleObj == null || CsCodeInspect._emptyStr(tagName)) {
            return null
        }

    return eleObj.getElementsByTagName(tagName)
},

    /**
        根据xpath找元素
    **/
    _getElementsByXpath: function(parentNode, xpath) {
        if (CsCodeInspect._emptyStr(xpath)) {
            return null;
        }

        if (parentNode == null) {
            parentNode = document;
        }

        var elements = new Array();
        var result = document.evaluate(xpath, parentNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        if (result) {
            var node = result.iterateNext();
            while (node) {
                elements.push(node);
                node = result.iterateNext();
            }
        }
        return elements;
    },

    /**判断对象是否为json**/
    _isJsonObj: function(obj) {
        return typeof(obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;
    },
    /**
     第一层匹配元素
    **/
    _findElements: function(jsonObj, parentNode) {
        //先从jsonObj中取出一些特别的属性，优化:id > class,如果没有这两个，其它属性name,type,value,title用xpath匹配，否则最后用
        //有选择器@selector，优先用选择器
        var id = null;
        var className = null;
        var path = "";
        var tagName = "";
        var selector = null;
        var index = null;
        var text = null;
        var isNewRule = false;
        var outertext = null;
        var isNeedMatchAttrRule = false;
        var ismodifyoldrule = false;

        for (var key in jsonObj) {
            var attrName = key.toLowerCase();
            var attrValue = jsonObj[key];
            if (CsCodeInspect._emptyStr(attrValue)) {
                continue;
            }

            if(!isNeedMatchAttrRule){
                isNeedMatchAttrRule = !CsCodeInspect._notNeedValidateAttr(attrName);
            }

            switch(attrName){
                case "tag":
                    tagName = attrValue;
                    break;
                case "@selector":
                    selector = attrValue;
                    break;
                case "@index":
                    index = attrValue;
                    break;
                case "@text":
                    text = attrValue;
                    break;
                case "id":
                    id = attrValue;
                    break;
                case "class":
                    className = attrValue;
                    break;
                case '@isnewrule':
                    isNewRule = true;
                    break;
                case '@ismodifyoldrule':
                    ismodifyoldrule = true;
                    break;
                case 'outertext':
                    outertext = attrValue;
                    break;
            }
            //其它xpath属性
            if (attrName == "type" || attrName == "value" || attrName == "name" || attrName == "title") {
                path += "[@" + attrName + "='" + attrValue + "']";
            } else if (attrName == "href" || attrName == "src" || attrName == "alt") {
                path += "[contains(@" + attrName + ",'" + attrValue + "')]";
            }
        }

        if (id == null && tagName == "" && className == "") {
            return null;
        }

        var elements = null;
        //根据selector找元素,如果是通过选择器找到的元素，其它元素不再匹配
        if(selector != null){
            //根据index,text替换一下
            if(index){
                //取出第一个nth-child，并替换成index
                selector = selector.replace(/nth-child\(\d+\)/,"nth-child("+index+")")
            }else if(!isNewRule && !ismodifyoldrule && selector.indexOf(":nth-child") > -1){
                  //如果没有index,替换第一个nth-child
                selector = selector.replace(/:nth-child\(\d*\)/,"");
            }
            
            if(text){
                //如果有值，加上:contains
                selector +=  ":contains(\""+text+"\")";
            }else if(isNewRule && outertext){
                selector +=  ":contains(\""+outertext+"\")";
            }

            //console.log(selector);
            var jElements = WebInspector.DOMPresentationUtils.querySelector(selector,parentNode);
            if(jElements != null){
                elements = new Array();
                //如果是新录制的，有selector还要继续校验其它的属性：
                if(!isNewRule || !isNeedMatchAttrRule){
                    CsCodeInspect._selectorMatch = true;
                }

                for(var i=0; i< jElements.length; i++){
                    elements.push(jElements[i])
                }
                return elements;
            }
        }

        //第一次找元素
        if (id != null) {
            var elements = new Array();
            var eleObj = parentNode.getElementById(id);
            if (eleObj != null) {
                elements.push(eleObj);
            }
            return elements;
        }

        if (className != null) {
            return parentNode.getElementsByClassName(className);
        }

        if (path != "") {
            return CsCodeInspect._getElementsByXpath(parentNode, ".//" + tagName + path);
        }

        //根据tagName获取
        return parentNode.getElementsByTagName(tagName);
    },

    /**
        从outhtml中正则提取attrvalue的值,与eleValue比，如果相同，返回true
    **/
    _IsJwbExpMatch: function(elementObj, eleValue, attrValue) {

    },

    /**
     属性匹配
    **/
    _IsAttributeMatch: function(elementObj, attrName, attrValue) {
        var matchAttrName = attrName;
        switch (attrName) {
            case ("namexp"):
                matchAttrName = "name";
                break;
            case ("idexp"):
                matchAttrName = "id";
                break;
            case ("typexp"):
                matchAttrName = "type";
                break;
            case ("valuexp"):
                matchAttrName = "value";
                break;
            case ("classname"):
                matchAttrName = "class";
                break;
            case ("classnamexp"):
                matchAttrName = "class";
                break;
            case ("classexp"):
                matchAttrName = "class";
                break;
            case ("titlexp"):
                matchAttrName = "title";
                break;
            case ("outertext_j"):
                matchAttrName = "outerText";
                break;
            case ("outertext"):
                matchAttrName = "outerText";
                break;
            case ("outertext_m"):
                matchAttrName = "outerText";
                break;
            case ("outerhtml"):
                matchAttrName = "outerHTML";
                break;
            case ("innertext"):
                matchAttrName = "innerText";
                break;
            case ("innerhtml"):
                matchAttrName = "innerHTML";
                break;
            default:
                //如果是以exp结尾，去掉exp
                if(attrName.substring(attrName.length-3) === 'exp'){
                    matchAttrName = attrName.substring(0,attrName.length-3);
                    //这里要考虑一下e的，这个后面要改，暂时先处理style
                    if(matchAttrName == "styl"){
                        matchAttrName = "style";
                    }
                }else{
                    matchAttrName = attrName;
                }
                break;
        }

        //获取属性值：
        var eleValue = null;
        switch (matchAttrName) {
            case ("outerText"):
                eleValue = elementObj.textContent || elementObj.outerText;
                //outerText做个转化
                eleValue = eleValue.replace(/[\r\n\t]/g,"").replace(/(^\s*)|(\s*$)/g,"")
                break;
            case ("outerHTML"):
                eleValue = elementObj.outerHTML;
                break;
            case ("innerText"):
                eleValue = elementObj.innerText;
                break;
            case ("innerHTML"):
                eleValue = elementObj.innerHTML;
                break;
            default:
                eleValue = elementObj.getAttribute(matchAttrName);
                break;
        }

        if (eleValue == null || eleValue == "") {
            return false;
        }

        //去空处理
        //将eleValue的\t替换成四个空格
        eleValue = CsCodeInspect._converSpecialStr(eleValue);
        eleValue = CsCodeInspect._trim(eleValue);
        attrValue = CsCodeInspect._trim(attrValue);
        if (attrValue == eleValue) {
            return true;
        }

        //如果有[JWBEXP],需要特别处理：
        if (attrValue.indexOf("[JWBEXP]") > -1) {
            return CsCodeInspect._IsJwbExpMatch(elementObj, eleValue, attrValue.substring(8))
        }
        

        if ((attrName.indexOf("exp") > -1 || matchAttrName == 'outerText') && CsCodeInspect._stringRegMatch(eleValue, attrValue)) {
            return true;
        }

        if (attrName == "href" || attrName == "src" || attrName == "alt") {

            return eleValue.indexOf(attrValue) > -1;
        }

        return false;
    },

    /***
     * 不需要检验规则的属性
     */
    _notNeedValidateAttr : function(attrName){
        return "controltype" == attrName || "iframeid" == attrName || "iframesrc" == attrName 
                || 'iframeidexp' == attrName || 'locationurl' == attrName 
                || attrName.indexOf("@") > -1 || attrName == '@isnewrule';
    },

    /**
     校验属性是否满足
    **/
    _validateAttr: function(jsonObj, elementObj) {
        if (elementObj == null) {
            return false;
        }

        var matchEle = null;
        for (var key in jsonObj) {
            var attrName = key.toLowerCase();
            var attrValue = jsonObj[key];
            if (CsCodeInspect._emptyStr(attrValue)) {
                continue;
            }

            //tag验证
            if ("tag" == attrName) {
                if (attrValue.toLowerCase() == elementObj.nodeName.toLowerCase()) {
                    matchEle = elementObj;
                    continue;
                } else {
                    return false;
                }
            }


            if ("tagindex" == attrName) {
                continue;
            }

            if (CsCodeInspect._notNeedValidateAttr(attrName)) {
                continue;
            }

            var matcher = CsCodeInspect._IsAttributeMatch(elementObj, attrName, attrValue);
            if (!matcher) {
            return false;
            } 
            matchEle = elementObj;
        }

        return matchEle != null;
    },

    _buildParentJsonObj: function(parentElementstr, parentElementIndex) {
        return {
            "parentElementstr": null,
            "parentEleIndex": null,
            "element": parentElementstr,
            "index": parentElementIndex
        };
    },
    /** 取url?前面的部分，比如www.baidu.com?&type=1  www.baidu.com**/
    _getIframeSrc: function(url) {
        if (url == null) return ""
        var posi = url.indexOf("?");
        if (posi == -1) return url;
        return url.substring(0, posi);
    },

    /**
     * 获取根节点坐标：针对iframe
     * @param {*} eleJsonObj 
     * @param {*} parentNode 
     */
    _getRootPosition(eleJsonObj,parentNode){
        var iframesrc = null;
        var iframeidexp = null;
        for (var key in eleJsonObj) {
            var attrName = key.toLowerCase();
            var attrValue = CsCodeInspect._trim(eleJsonObj[key]);
            if (CsCodeInspect._emptyStr(attrValue)) {
                continue;
            }

            if ("iframesrc" == attrName || "locationurl" == attrName) {
                iframesrc = attrValue;
                CsCodeInspect._iframeSrc = attrValue;
            }

            if (attrName.indexOf("iframeid") > -1) {
                iframeidexp = attrValue;
                break;
            }
        }

        //iframesrc,iframeidexp
        if (iframesrc != null || iframeidexp != null) {
            return CsCodeInspect.iframe.getIframeRootPosi(iframesrc != null ? iframesrc : iframeidexp);
        }

        return {left:0,top:0};
    },

    /**
        有关根元素:以iframe为先，如果有指定iframe,先从iframe中找，否则从document中找
        isDocument=true:取元素的文本，否则：框架本身
        parentNode:指定查找范围
    **/
    _getRootDoc: function(eleJsonObj, isDocument, parentNode) {
        if (!isDocument) isDocument = true;
        if(!parentNode) parentNode = document;
        var iframesrc = null;
        var iframeidexp = null;
        for (var key in eleJsonObj) {
            var attrName = key.toLowerCase();
            var attrValue = CsCodeInspect._trim(eleJsonObj[key]);
            if (CsCodeInspect._emptyStr(attrValue)) {
                continue;
            }

            if ("iframesrc" == attrName || "locationurl" == attrName) {
                iframesrc = attrValue;
                CsCodeInspect._iframeSrc = attrValue;
            }

            if (attrName.indexOf("iframeid") > -1) {
                iframeidexp = attrValue;
                break;
            }
        }

        //iframesrc,iframeidexp
        if (iframesrc != null || iframeidexp != null) {
            var target = CsCodeInspect.iframe.getIframeElement(iframesrc != null ? iframesrc : iframeidexp,parentNode);
            return target == null ? parentNode : target.contentDocument;
           /* try {
                var iframes = document.getElementsByTagName("iframe");
                for (var i = 0; i < iframes.length; i++) {
                    var iframeObj = iframes[i];
                    //iframesrc匹配到,更智能些，只取?前面的部分进行匹配

                    if (iframesrc != null && 
                         (CsCodeInspect._getIframeSrc(iframeObj.src).indexOf(CsCodeInspect._getIframeSrc(iframesrc)) > -1
                         || CsCodeInspect._stringRegMatch(iframeObj.id, iframesrc))) {
                        return isDocument ? iframeObj.contentWindow.document : iframeObj;
                    }
                    //iframeidexp
                    if (iframeidexp != null && CsCodeInspect._stringRegMatch(iframeObj.id, iframeidexp)) {
                        return isDocument ? iframeObj.contentWindow.document : iframeObj;
                    }
                }
            } catch (e) {
                console.log("取iframe报错:iframe.src=" + iframesrc);
            }*/
        }

        return parentNode;
    },

    /**
     * 获取父对象
     */
    _getParentObj:function(jsonObj){
        var parentElementstr = jsonObj.parentElement;
        var parentElementIndex = jsonObj.parentEleIndex;
        var elementstr = jsonObj.element;
        let parentNode;
        if(parentElementstr){
            parentNode = CsCodeInspect._getElementObj(CsCodeInspect._buildParentJsonObj(parentElementstr, parentElementIndex));
        }
        var eleJsonObj = JSON.parse(elementstr)
        return CsCodeInspect._getRootDoc(eleJsonObj, true , parentNode);
    },

    /**
        获取元素对象
    **/
    _getElementObj: function(jsonObj,isGetAll = false) {
        //isGetAll = isGetAll || false;
        let elementstr = jsonObj.element;
        let index = jsonObj.index;
        if (elementstr == null || elementstr == '') {
            return null
        }
        let eleJsonObj = JSON.parse(elementstr)
        let parentNode = CsCodeInspect._getParentObj(jsonObj);
        if (parentNode == null) {
            return null
        }
        //父亲可能也会匹配了CsCodeInspect._selectorMatch，要排除
        CsCodeInspect._selectorMatch = false;
        let elements = CsCodeInspect._findElements(eleJsonObj, parentNode);
        if (elements == null || elements.length == 0) {
            return null;
        }
        //如果是selector，不用再做第二次过滤
        if(CsCodeInspect._selectorMatch){
            if(isGetAll) return elements;
            if (CsCodeInspect._emptyStr(index)){
                index = 1;
            }
            if(index > elements.length){
                index = elements.length;
            }
            return elements[index - 1];
        }

        //第二次过滤：遍历，匹配其它属性
        let j = 1;
        let allMatchElements = new Array();
        for (let i = 0; i < elements.length; i++) {
            //匹配属性
            if (CsCodeInspect._validateAttr(eleJsonObj, elements[i])) {
                if(!isGetAll){
                    //如果有index
                    if (CsCodeInspect._emptyStr(index) || index == j) {
                        return elements[i];
                    }
                    j++;
                }else{
                    allMatchElements.push(elements[i])
                }
            }
        }
        return isGetAll ? allMatchElements : null;
    },

    /**
        获取匹配元素数量
    **/
    _getElementCount: function(jsonObj) {
        var elementstr = jsonObj.element;
        if (elementstr == null || elementstr == '') {
            return 0
        }
        let eleJsonObj = JSON.parse(elementstr)
        let parentNode = CsCodeInspect._getParentObj(jsonObj);
        if (parentNode == null) {
            return 0
        }
        CsCodeInspect._selectorMatch = false;
        let elements = CsCodeInspect._findElements(eleJsonObj, parentNode);
        if (elements == null || elements.length == 0) {
            return 0;
        }
        

        //如果是selector，不用再做第二次过滤
        if(CsCodeInspect._selectorMatch){
            return elements.length;
        }

        //第二次过滤：遍历，匹配其它属性
        let count = 0;
        for (let i = 0; i < elements.length; i++) {
            //匹配属性
            if (CsCodeInspect._validateAttr(eleJsonObj, elements[i])) {
                count++;
            }
        }
        return count;
    },

    /** 获取iframe框的坐标**/
    _getIFramePosi: function(jsonObj) {
        var eleObj = JSON.parse(jsonObj.element);
        var root = CsCodeInspect._getRootDoc(eleObj, false);
        if (root == document) {
            return null;
        }
        return {
            "x": CsCodeInspect._getElementViewLeft(root),
            "y": CsCodeInspect._getElementViewTop(root)
        }
    },

    /**
     取元素的x坐标，加上滚动条之后的坐标
    **/
    _getElementViewLeft: function(element) {
        var actualLeft = element.offsetLeft;
        var current = element.offsetParent;
        while (current !== null) {
            actualLeft += current.offsetLeft;
            current = current.offsetParent;
        }
        return actualLeft;
    },

    /**
        取元素的Y坐标，加上滚动条之后的坐标
    **/
    _getElementViewTop: function(element) {
        var actualTop = element.offsetTop;
        var current = element.offsetParent;
        while (current !== null) {
            actualTop += current.offsetTop;
            current = current.offsetParent;
        }
        return actualTop;
    },

    /**
        生成返回值，用于异常调用
    **/
    _generateReturn: function(callbackFuncName, result) {
        var req = "{'Method': '" + callbackFuncName + "', 'Param': " + result + "}";
        window.cefQuery({ request: req });
    },

    _triggerEvent: function(el, eventName) {
        if (el.fireEvent) { // < IE9
            (el.fireEvent('on' + eventName));
        } else {
            var evt = document.createEvent('Events');
            evt.initEvent(eventName, true, false);
            el.dispatchEvent(evt);
        }
    },

    /** 元素是否存在**/
    cs_elementExist: function() {
        if (arguments.length != 1) {
            return "0";
        }
        //解析json，获取参数对象
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var eleObj = CsCodeInspect._getElementObj(arguments[0]);
        if (eleObj == null) {
            return "-1";
        }
        return "1";
    },
    /*
        元素执行执行点击动作
    */
    cs_click: function() {
        if (arguments.length != 1) {
            return "0";
        }
        //解析json，获取参数对象
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var eleObj = CsCodeInspect._getElementObj(arguments[0]);
        if (eleObj == null) {
            return "-1";
        }
        eleObj.click();
        return 1;
    },

    /**
        元素执行输入动作:这种是追加输入
    */
    cs_input: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];

        if (jsonObj.value == null || jsonObj.value == '') {
            return "1";
        }
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        eleObj.focus();
        //如果是非inupt.textarea这种输入框，将值设置为outerText
        var tagName = eleObj.nodeName.toLowerCase();
        if (tagName == "input" || tagName == "textarea" || tagName == "select") {
            eleObj.value = eleObj.value + jsonObj.value;
        } else {
            eleObj.innerText = eleObj.innerText + jsonObj.value
        }
        return 1;
    },

    /**
        清空输入动作:这种会先清空原来的值输入
    */
    cs_clearInput: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }

        var jsonObj = arguments[0];

        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        eleObj.focus();
        //如果是非inupt.textarea这种输入框，将值设置为innerText
        var tagName = eleObj.nodeName.toLowerCase();
        if (tagName == "input" || tagName == "textarea" || tagName == "select") {
            eleObj.value = jsonObj.value;
        } else {
            eleObj.innerText = jsonObj.value
        }
        return 1;
    },

    /**
        下拉选择：完全匹配输入值
    */
    cs_optionClick: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }

        var jsonObj = arguments[0];
        if (jsonObj.value == null || jsonObj.value == '') {
            return "0";
        }

        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }

        var array = CsCodeInspect._getTagNameCollection(eleObj, "option");
        if (array == null || array.length == 0) {
            return "0";
        }

        for (var item = 0; item < array.length; item++) {
            var itemText = CsCodeInspect._trim(array[item].outerText);
            if (itemText == jsonObj.value) {
                eleObj.focus();
                array[item].selected = true;
                array[item].focus();
                array[item].click();
                CsCodeInspect._triggerEvent(eleObj, 'change');
                //console.log(eleObj);
                return 1;
            }
        }
        return "0";
    },

    /**
        模糊下拉:包含关系
    **/
    cs_simulativeOptionClick: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        if (jsonObj.value == null || jsonObj.value == '') {
            return 0;
        }

        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }

        var array = CsCodeInspect._getTagNameCollection(eleObj, "option");
        if (array == null || array.length == 0) {
            return 0;
        }

        for (var item = 0; item < array.length; item++) {
            var itemText = CsCodeInspect._trim(array[item].outerText);
            if (itemText.indexOf(jsonObj.value) > -1) {
                eleObj.focus();
                array[item].selected = true;
                array[item].focus();
                array[item].click();
                CsCodeInspect._triggerEvent(eleObj, 'change');
                return 1;
            }
        }
        return 0;
    },

    /**
        正则下拉：支持正则表达式
    **/
    cs_expOptionClick: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        if (jsonObj.value == null || jsonObj.value == '') {
            return 0;
        }

        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return -1;
        }

        var array = CsCodeInspect._getTagNameCollection(eleObj, "option");
        if (array == null || array.length == 0) {
            return "0";
        }

        for (var item = 0; item < array.length; item++) {
            var itemText = CsCodeInspect._trim(array[item].outerText);
            if (CsCodeInspect._stringRegMatch(itemText, jsonObj.value)) {
                eleObj.focus();
                array[item].selected = true;
                array[item].focus();
                array[item].click();
                CsCodeInspect._triggerEvent(eleObj, 'change');
                return 1;
            }
        }
        return 0;
    },

    /**
        获取页面文本
    **/
    cs_getText: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);

        //未找到元素
        if(eleObj == null && !CsCodeInspect._emptyStr(jsonObj.element)){
            return "-1";
        }

        if (eleObj == null) {
            eleObj = document.documentElement;
        }

        return eleObj.outerText || eleObj.value;
    },

    /**
        获取页面html
    **/
    cs_getHtml: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);  
        //未找到元素
        if(eleObj == null && !CsCodeInspect._emptyStr(jsonObj.element)){
            return "-1";
        }

        if (eleObj == null) {
            eleObj = document.documentElement;
        }

        return eleObj.outerHTML.replace(/\r/g, "").replace(/\n/g, "").replace(/\t/g, "");
    },

    /**
     * 获取页面链接
     */
    cs_getLink : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);  
        //未找到元素
        if(eleObj == null && !CsCodeInspect._emptyStr(jsonObj.element)){
            return "-1";
        }  
        return CsCodeInspect.Node.getLink(eleObj);
    },

    /**
    获取页面元素的值
    **/
    cs_getElementValue: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        return eleObj.value || eleObj.outerText;
    },

    /**
    勾选某个元素
    **/
    cs_check: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }

        if (!eleObj.checked) {
            eleObj.focus();
            eleObj.click();
            return 1;
        }
        return 1;
    },

    /**
        取消勾选某个元素
    **/
    cs_noCheck: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }

        if (eleObj.checked) {
            eleObj.focus();
            eleObj.click();
            return 1;
        }
        return 1;
    },

    /**
        是否勾选
    **/
    cs_isCheck: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        return eleObj.checked ? "是" : "否";
    },

    /**
     * 是否可见
     */
    cs_isDisplayed : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        } 
        let isDisplayed = CsCodeInspect.Node.isDisplayed(eleObj);
        return isDisplayed == 1 ? '是' : '否';   
    },

    /**
        等待某个元素加载出来,最多等待10s，每检测一次等待100ms
    **/
    cs_elementIsPresent: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var eleObj = CsCodeInspect._getElementObj(arguments[0]);
        if (eleObj == null) {
            return "-1";
        }
        return "1";
    },
    
    /**
        定位到指定的元素
    **/
    cs_scrollIntoView: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj)
        if (eleObj == null) {
            return "-1";
        }
        eleObj.scrollIntoView();
        //获取元素的坐标Y坐标
        /*var y = CsCodeInspect._getElementViewTop(eleObj);
        if(y > 0){
            document.body.scrollTop = CsCodeInspect._getElementViewTop(eleObj)
        }*/
        return "1";
    },

    /**
        获取元素的坐标和位置
    **/
    cs_getElePosAndPosition: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj)
        if (eleObj == null) {
            return "-1";
        }

        var x = CsCodeInspect._getElementViewLeft(eleObj);
        var y = CsCodeInspect._getElementViewTop(eleObj);

        //针对iframe,再加上框架的坐标
        var iframePosObj = CsCodeInspect._getIFramePosi(arguments[0]);
        if (iframePosObj != null) {
            x1 += iframePosObj.x;
            y1 += iframePosObj.y;
        }

        var width = eleObj.offsetWidth;
        var height = eleObj.offsetHeight;
        return '{"x":' + x + ',"y":' + y + ',"width":' + width + ',"height":' + height + '}';
    },

    _getWindowViewHight: function() {
    　　var windowHeight = 0;
    　　if(document.compatMode == "CSS1Compat"){
    　　　　windowHeight = document.documentElement.clientHeight;
    　　}else{
    　　　　windowHeight = document.body.clientHeight;
    　　}
    　　return windowHeight;
    },

    _getWindowViewWidth: function() {
        var clientWidth = 0;
    　　if(document.compatMode == "CSS1Compat"){
            clientWidth = document.documentElement.clientWidth;
    　　}else{
            clientWidth = document.body.clientWidth;
    　　}
    　　return clientWidth;
    },
    /**
        根据yposi坐标值，判断是否要将元素移动到屏幕中间（Y轴）
    **/
    _localteEleYPostion: function(yPosi) {
        var scrollTop = document.body.scrollTop;
        var viewHeight = CsCodeInspect._getWindowViewHight();
        //先判断在滚动条上方还是下方
        if (yPosi < scrollTop) {
            //在上方，要判断是否需要上翻，获取当前body展示内容的高度
            var needScrollTop = yPosi - viewHeight / 2 < 0 ? 0 : yPosi - viewHeight / 2;
            document.body.scrollTop = needScrollTop;
            return needScrollTop == 0 ? yPosi : yPosi - viewHeight / 2
        } else {
            //在下方,要判断是否要下翻
            if (yPosi - scrollTop - viewHeight > 0) {
                var scrollHeight = document.body.scrollHeight;
                document.body.scrollTop = yPosi - viewHeight / 2;
                if (yPosi + viewHeight < scrollHeight) {
                    return viewHeight / 2;
                }
                return viewHeight - (scrollHeight - yPosi);
            } else {
                //在当前屏幕中
                return yPosi - scrollTop;
            }
        }
    },

    /**
        根据xPosi坐标值，判断是否要将元素移动到屏幕中间（X轴）
    **/
    _localteEleXPostion: function(xPosi) {
        var scrollLeft = document.body.scrollLeft;
        var viewWidth = CsCodeInspect._getWindowViewWidth();
        //判断在左侧还是右侧
        if (xPosi < scrollLeft) {
            //在左侧，是否要左翻 
            var needScrollLeft = xPosi - viewWidth / 2 < 0 ? 0 : xPosi - viewWidth / 2;
            document.body.scrollLeft = needScrollLeft;
            return needScrollLeft == 0 ? xPosi : xPosi - viewWidth / 2;
        } else {
            //在右侧
            if (xPosi - scrollLeft - viewWidth > 0) {
                //在右面屏幕中，需要右翻,可能翻到底
                var scrollWidth = document.body.scrollWidth;
                document.body.scrollLeft = xPosi - viewWidth / 2;
                if (xPosi + viewWidth / 2 < scrollWidth) {
                    return viewWidth / 2;
                }
                return viewWidth - (scrollWidth - xPosi);
            } else {
                //在当前屏幕中
                return xPosi - scrollLeft;
            }
        }
    },
    /**
        获取突出显示时，元素的坐标与大小：将元素展示到可见区域,然后计算其在可见区域的坐标。
    **/
    cs_getHighlightPositionAndSize: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var eleObj = CsCodeInspect._getElementObj(arguments[0]);
        if (eleObj == null) {
            return "-1";
        }
        let parentNode = CsCodeInspect._getParentObj(arguments[0]);
        var posiObj = CsCodeInspect._getElementPosition(eleObj,arguments[0],parentNode);
        if(posiObj)
            return WebInspector.DOMPresentationUtils.toJSON(posiObj);
    },

    /** */
    _getElementPosition : function(eleObj,jsonObj,parentNode){
        eleObj.scrollIntoViewIfNeeded();
        let { left, top, width, height } = eleObj.getBoundingClientRect();
        var eleJsonObj = JSON.parse(jsonObj.element);
        var frameOffset = CsCodeInspect._getRootPosition(eleJsonObj);
        if (frameOffset != null) {
            left += frameOffset.left;
            top += frameOffset.top;
        }
        return {
                left: left,
                top: top,
                width: width,
                height: height
            };
    },

    /**将元素置于屏幕，并获取四个坐标**/
    cs_seeEleAndGetPosi: function() {
        if (arguments.length != 1) {
            return "0";
        }

        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }

        var eleObj = CsCodeInspect._getElementObj(arguments[0]);
        if (eleObj == null) {
            return "0";
        }

        var  { left, top, width, height } = CsCodeInspect._getElementPosition(eleObj,arguments[0]);
        return WebInspector.DOMPresentationUtils.toJSON({
            x1: String(left),
            y1: String(top),
            x2: String(left + width),
            y2: String(top + height)
        });
    },

    /**
     * 获取模拟操作的位置点坐标，直接返回可操作的x,y坐标
     * 1、取中心点坐标，判断此坐标下元素是否为当前元素--是，返回。
     * 2、取中心点上面一半中心点，再判断 --是，返回
     * 3、取中心点下面一半中心点，再判断 --是，返回
     * 4、取中心点左面一半中心点，再判断 --是，返回
     * 5、取中心点右面一半中心点，再判断 --是，返回
     */
    cs_getSimulativeOperatePosi : function(){
        if (arguments.length != 1) {
            return "0";
        }

        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }

        var eleObj = CsCodeInspect._getElementObj(arguments[0]);
        if (eleObj == null) {
            return "0";
        }      

        eleObj.scrollIntoViewIfNeeded();
        let { left, top, width, height } = eleObj.getBoundingClientRect();
        var eleJsonObj = JSON.parse(arguments[0].element);
        var frameOffset = CsCodeInspect._getRootPosition(eleJsonObj);
        if (frameOffset != null) {
            left += frameOffset.left;
            top += frameOffset.top;
        }

        //取中心点：
        let centerX1 = left + 1/2 * width;
        let centerY1 = top + 1/2 * height;
        if(checkIsContent(centerX1,centerY1))
            return WebInspector.DOMPresentationUtils.toJSON({
            x: String(centerX1),
            y: String(centerY1)
        });

        //取上面一半的中心点
        let centerX2 = centerX1;
        let centerY2 = centerY1 - 1/4 * height;
        if(checkIsContent(centerX2,centerY2))
            return WebInspector.DOMPresentationUtils.toJSON({
            x: String(centerX2),
            y: String(centerY2)
        });

        //取下面一半的中心点
        let centerX3 = centerX1;
        let centerY3 = centerY1 + 1/4 * height;
        if(checkIsContent(centerX3,centerY3))
            return WebInspector.DOMPresentationUtils.toJSON({
            x: String(centerX3),
            y: String(centerY3)
        });

        //取左边一半的中心点
        let centerX4 = centerX1 - 1/4 * width;
        let centerY4 = centerY1;
        if(checkIsContent(centerX4,centerY4))
            return WebInspector.DOMPresentationUtils.toJSON({
            x: String(centerX4),
            y: String(centerY4)
        });

        //取右边一半的中心点
        let centerX5 = centerX1 + 1/4 *width;
        let centerY5 = centerY1;
        if(checkIsContent(centerX5,centerY5))
            return WebInspector.DOMPresentationUtils.toJSON({
            x: String(centerX5),
            y: String(centerY5)
        });

        //都不行，点左上角
        return WebInspector.DOMPresentationUtils.toJSON({
            x: String(centerX1),
            y: String(centerY1)});

        /**判断坐标是否满足：坐标下的元素为当前元素 */
        function checkIsContent(x,y){
            let obj = document.elementFromPoint(x,y);
            if(obj === eleObj){
                return true;
            }
            return false;
        }

    },

    /**
     获取元素数量
    **/
    cs_getEleCount: function() {
        if (arguments.length != 1) {
            return "0";
        }
        //解析json，获取参数对象
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        return CsCodeInspect._getElementCount(jsonObj);
    },

    /**
        获取当前浏览器页面的可显示部分高度与内容高度（包括滚动内不可见）与已滚动部分的高度（滚动条Y轴）
    **/
    cs_getBodyHeights: function() {
        var viewHeight = document.body.clientHeight;
        var scrollHeight = document.body.scrollHeight;
        var scrollTop = document.body.scrollTop;
        return "{\"viewHeight\":\"" + viewHeight + "\",\"scrollHeight\":\"" + scrollHeight + "\",\"scrollTop\":\"" + scrollTop + "\"}";
    },
    /** 获取页面大小比例**/
    cs_getPageScaleFactor: function() {
        return window.screen.width / window.innerWidth;
    },

    /** 让元素获取焦点**/
    cs_elementGetFocus: function() {
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "0";
        }
        eleObj.focus();
        setTimeout("",500)
        eleObj.value = "";
        return 1;
    },

    /**
     * 获取元素的cssPath
     */
    cs_getCssPath : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "0";
        }
        //取全的cssPath
        return cssPath = (WebInspector.DOMPresentationUtils.cssPath).call(eleObj,false,true,false);
    },

    /** 获取cookie**/
    cs_getCookie: function() {
        return document.cookie;
    },

    _changeParentElementToElement(jsonObj){
        var newJsonObj = {};
        if(!CsCodeInspect._emptyStr(jsonObj.parentElement)){
            newJsonObj.element = jsonObj.parentElement;
            newJsonObj.index = jsonObj.parentEleIndex;
        }
        return newJsonObj;
    },

    /** 设置纵滚动条坐标**/
    cs_setScrollTop: function() {
        var jsonObj = arguments[0];
        //将json重新组装下
        var newJsonObj = CsCodeInspect._changeParentElementToElement(jsonObj);
        var eleObj = CsCodeInspect._getElementObj(newJsonObj);
        if (eleObj == null) {
            eleObj = document.body;
        }

        var height;
        if (arguments.length == 1 && arguments[0].height != '') {
            height = arguments[0].height;
        }

        height = height || CsCodeInspect._getWindowViewHight();
        //找元素
        eleObj.scrollTop = height;
        return 1
    },

    /** 获取纵滚动条坐标**/
    cs_getScrollTop: function() {
        var jsonObj = arguments[0];
        //将json重新组装下
        var newJsonObj = CsCodeInspect._changeParentElementToElement(jsonObj);
        var eleObj = CsCodeInspect._getElementObj(newJsonObj);
        if (eleObj == null) {
            eleObj = document.body;
        }
        return eleObj.scrollTop;
    },

    /**
     * 获取滚动条的高度
     */
    _getScrollHeight : function(){
    　var scrollHeight = 0, bodyScrollHeight = 0, documentScrollHeight = 0;
    　　if(document.body){
    　　　　bodyScrollHeight = document.body.scrollHeight;
    　　}
    　　if(document.documentElement){
    　　　　documentScrollHeight = document.documentElement.scrollHeight;
    　　}
    　　scrollHeight = (bodyScrollHeight - documentScrollHeight > 0) ? bodyScrollHeight : documentScrollHeight;
    　　return scrollHeight;
    },

    _getScrollTop : function(){
    　　var scrollTop = 0, bodyScrollTop = 0, documentScrollTop = 0;
    　　if(document.body){
    　　　　bodyScrollTop = document.body.scrollTop;
    　　}
    　　if(document.documentElement){
    　　　　documentScrollTop = document.documentElement.scrollTop;
    　　}
    　　scrollTop = (bodyScrollTop - documentScrollTop > 0) ? bodyScrollTop : documentScrollTop;
    　　return scrollTop;
    },

    /** 滚屏，再加height**/
    cs_scrollPage: function() {
        var height;
        if (arguments.length == 1 && arguments[0].height != '') {
            height = arguments[0].height;
        }

         var windowHeight = CsCodeInspect._getWindowViewHight();

        var scrollHeight = CsCodeInspect._getScrollHeight();
        var scrollTop = CsCodeInspect._getScrollTop();
        //是否到底了
        if (scrollTop + windowHeight == scrollHeight) {
            return "0";
        }
        
        height = height || windowHeight;
        document.body.scrollTop += height;
        //以防万一，如果滚动后，scrollTop与之前一样，返回0
        if(scrollTop == document.body.scrollTop){
            return "0"
        }
        return "1"
    },

    /**
     * 上一次回显是否已结束
     */
    cs_isHightlightdone : function(){
        if(CsCodeInspect._highlightIsDone){
            return "1"
        }else{
            return "0";
        }
    },

    /**
     * 获取元素的节点信息：属性、有些也取子节点
     */
    cs_getNodeInfoAndHighlight : function(){
        CsCodeInspect._iframeSrc = null;
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "0";
        }
        var nodeInfo = CsCodeInspect._gatherNodeInfo(eleObj);
        if(nodeInfo == null){
            return 0;
        }
        //高亮元素：不闪
        let nodes = new Array();
        nodes.push(eleObj);
        CsCodeInspect.highlight.highlightNodes(CsCodeInspect._iframeSrc,nodes);
        return WebInspector.DOMPresentationUtils.toJSON(nodeInfo);
    },

    cs_getSelectOptions : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }

        let options = new Array();
        let tagName = eleObj.nodeName.toLowerCase();
        if(tagName === "select"){
            var chilerenNode = eleObj.options;
            for(var i=0;i<chilerenNode.length;i++){
                var node = chilerenNode[i];
                options.push(node.text);
            }
        }

        return WebInspector.DOMPresentationUtils.toJSON(options);
    },

    /**
     * 获取结点信息
     */
    _gatherNodeInfo : function(nodeObj){
        var nodeInfoObj = new Object();
        var tagName = nodeObj.nodeName.toLowerCase();
        var type = nodeObj.type && typeof nodeObj.type == "string" && nodeObj.type.toLowerCase();
        //contenteditable获取所有上层节点
        var contentEditable = isContenteditable(nodeObj);
        //获取文本，如果文本值在6个字以内，取这个作为控件名
        var text = '';
        var nodeText = '';
        var readOnly = false;
        if(tagName === 'input' || isBtn(type)){
            nodeText = nodeObj.value || nodeObj.innerText;
            readOnly = nodeObj.readOnly;
        }else{
            nodeText = nodeObj.innerText;
        }
        nodeText = nodeText || '';
        if(nodeText.trim().length < 6){
            text = nodeText.trim();
        }
        
        //部分属性
        nodeInfoObj.attr = {
            tag : tagName,
            type : type,
            contentEditable : contentEditable,
            text : text,
            readOnly : readOnly
        };

        //针对checkbox radio，返回是否选中的结果
        if(tagName === 'input' && (type ==='checkbox' || type === 'radio')){
            nodeInfoObj.attr.checked = nodeObj.checked;
        }

        //针对select,取子节点
        nodeInfoObj.children = new Array();
        if(tagName === "select"){
            var chilerenNode = nodeObj.options;
            for(var i=0;i<chilerenNode.length;i++){
                var node = chilerenNode[i];
                nodeInfoObj.children.push(node.text);
            }
        }
        return nodeInfoObj;


        function isBtn(type){
            return type === 'button' || type === 'submit' || type === 'reset';
        }

        function isContenteditable(nodeObj){
            var currentNode = nodeObj;
            while(currentNode != null){
                var contentEditable = currentNode.contentEditable;
                if(contentEditable && contentEditable.toLowerCase() == "true"){
                    return true;
                }
                currentNode = currentNode.parentNode;
            }
            return '';
        }
    },

    /**回显 */
    cs_highlightElements : function(){
        CsCodeInspect._iframeSrc = null;
        //先取消回显:如果上一次回显有可能还没有结束,等待1s，放c#中实现,暂时不要
        CsCodeInspect.highlight.hideHighlightNodes();

        if (arguments.length != 1) {
            return "0";
        }
        var paramJson = arguments[0];
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var isShowAll = false;
        if(jsonObj.isShowAll == "1"){
            isShowAll = true;
        }
        //如果是isShowAll=false,要模拟一个数组出来
        var eleObjs = CsCodeInspect._getElementObj(arguments[0],isShowAll);
        if (eleObjs == null || eleObjs.length == 0) {
            return "0";
        }
        if(!isShowAll){
            var obj = eleObjs;
            eleObjs = new Array();
            eleObjs.push(obj);
        }
        //高亮处理：多个元素用js高亮效果，否则用debug-protocal效果
        var returnObj = new Object();
        //eleObjs[0].scrollIntoViewIfNeeded();
        //高亮做一个效果：亮一下，休息300，取消，休息300，做2次，然后一直亮着
        //setInterval来实现，会产生异步返回，暂时先写死
        var count=0;
        CsCodeInspect._highlightIsDone = false;
        doHighlight();
        var highlightInterval = setInterval(()=>{
                doHighlight(); 
                if(count > 2){
                    clearInterval(highlightInterval);
                    CsCodeInspect._highlightIsDone = true;
                    CsCodeInspect._highlightNodes = eleObjs;
                }
                count++;    
        },300);


        //取第一个元素，用于测试
        returnObj.count = eleObjs.length;
        if(eleObjs.length  > 0){
            returnObj.nodeInfo = CsCodeInspect._gatherNodeInfo(eleObjs[0]);
        }
        //获取第一个元素的信息
        return WebInspector.DOMPresentationUtils.toJSON(returnObj);

       function doHighlight(){
            if(count%2 == 0){
                CsCodeInspect.highlight.highlightNodes(CsCodeInspect._iframeSrc,eleObjs);
            }else{
                CsCodeInspect.highlight.hideHighlightNodes(); 
            }
        }
    },

    /**取消回显 */
    cs_hideHighlightElements : function(){
        CsCodeInspect.highlight.hideHighlightNodes();
        return "1";
    },

    /**
     * 设置innerHtml
     */
    cs_setInnerHtml : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        eleObj.innerHTML = jsonObj.value
        return "1";
    },

    /**
     * 设置innerText
     */
    cs_setInnerText : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        eleObj.innerText = jsonObj.value
        return "1";
    },

    /**
     * 显示下拉框
     */
    cs_showSelectDialog : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        //获取select值
        var tagName = eleObj.nodeName.toLowerCase();
        var values = new Array();
        if(tagName === "select"){
            var chilerenNode = eleObj.options;
            for(var i=0;i<chilerenNode.length;i++){
                values.push( chilerenNode[i].text);
            }
        }

        let parentNode = CsCodeInspect._getParentObj(arguments[0]);
        var posiObj = CsCodeInspect._getElementPosition(eleObj,arguments[0],parentNode);
        CsCodeInspect.ShowSelectDialog.show(posiObj,values);
    },

    cs_showInputDialog : function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }
        var jsonObj = arguments[0];
        var eleObj = CsCodeInspect._getElementObj(jsonObj);
        if (eleObj == null) {
            return "-1";
        }
        //要区分input textarea
        var tagName = eleObj.nodeName.toLowerCase();

        let parentNode = CsCodeInspect._getParentObj(arguments[0]);
        var posiObj = CsCodeInspect._getElementPosition(eleObj,arguments[0],parentNode);
        var type = eleObj.type;
        CsCodeInspect.ShowInputDialog.show(posiObj,type);
    },

    cs_showAlertDialog:function(){
        if (arguments.length != 1) {
            return "0";
        }
        if (!CsCodeInspect._isJsonObj(arguments[0])) {
            return "0";
        }     
        var jsonObj = arguments[0];
        if(!jsonObj.message){
            return;
        }
        alert(jsonObj.message);
        return 1;
    },

    cs_closeAllShowDialog : function(){
        CsCodeInspect.ShowInputDialog.close();
        CsCodeInspect.ShowSelectDialog.close();
        CsCodeInspect.ShowDataListDialog.close();
        return 1;
    },

    cs_showDataListDialog : function(){
        var jsonObj = arguments[0];
        CsCodeInspect.ShowDataListDialog.show(jsonObj);
    }

};

(function(f){
    f.iframe = {
        /**
         * 获取iframe对象及对象的坐标
         * @param {} iframesrc 
         */
        getIframeInfo(iframesrc,parentNode){
            if(!iframesrc)  return {iframeObj:null,position:{left:0,top:0}};
            if(!parentNode) parentNode = document;
            var target = parentNode;
            let top = 0;
            let left = 0;
            //2016/3/3 前期iframe只有简单的src,后续因iframe存在frameset或iframe多层嵌套，改成json格式
            try{
                var frameJson = JSON.parse(iframesrc);
                for(var i = frameJson.length-1; i>-1; i--){
                    if(target != document){
                        target = target.contentDocument;
                    }
                    var tag = frameJson[i].Tag;
                    var frameElements = null;
                    let matchEle =  null;
                    //判断有无selector,有selector，要先作一层过滤
                    let selectorJsonStr = frameJson[i].Selector;
                    if(selectorJsonStr){
                        try{
                            let selectorJson = JSON.parse(selectorJsonStr);
                            //frameElements中找selector
                            frameElements = target.querySelectorAll(selectorJson.optimizedCssPath);
                            if(frameElements.length > 0){
                                matchEle = getMatchIframe(frameJson[i],frameElements,false);
                            }
                        }catch(e){

                        }
                    }

                    if(!matchEle){
                        switch(tag){
                            case 'iframe':
                                frameElements = target.getElementsByTagName("iframe");
                                break;
                            case 'frame':
                                frameElements = target.getElementsByTagName("frame");
                                break;
                        }
                            //匹配相应的元素
                        if(frameElements == null || frameElements.length == 0){
                            return target;
                        }
                         matchEle = getMatchIframe(frameJson[i],frameElements,true);
                    }
             
                    if(matchEle){
                        target = matchEle;
                        let frameOffset = matchEle.getBoundingClientRect();
                        left += frameOffset.left + parseInt(getComputedStyle(matchEle)["padding-left"]);
                        top += frameOffset.top + parseInt(getComputedStyle(matchEle)["padding-top"]);
                    }
                }
            }catch(e){
                //console.log(e);
                //老的录制返回值
                var iframes = parentNode.getElementsByTagName("iframe");
                for (var i = 0; i < iframes.length; i++) {
                    var iframeObj = iframes[i];
                    //iframesrc匹配到,更智能些，只取?前面的部分进行匹配
                    if (iframesrc != null 
                            && (f._getIframeSrc(iframeObj.src).indexOf(f._getIframeSrc(iframesrc)) > -1
                            || f._stringRegMatch(iframeObj.id, iframesrc))) {
                        target = iframeObj;
                        let frameOffset = iframeObj.getBoundingClientRect();
                        left += frameOffset.left + parseInt(getComputedStyle(iframeObj)["padding-left"]);
                        top += frameOffset.top + parseInt(getComputedStyle(iframeObj)["padding-top"]);
                        break;
                    }
                }
                
            }

            return {iframeObj : target == parentNode ? null : target,
                    position : {top,left}};

            /**
             * iframe对象是否匹配
             */
            function getMatchIframe(matchIframe,frameElements,mustMatchOneProp=true){
                //这些frameElements是否有属性，如果是selector有可能匹配，但是无id,name,src等任一属性
                let noAnyPropExist = true
                //1、优先匹配src
                 for(let iframeElement of frameElements){
                    let src = iframeElement.src;
                    if(src)
                        noAnyPropExist = false;
                    let matchIframeSrc = matchIframe.Src;
                    //有src，匹配src
                    if(src && matchIframeSrc && f._getIframeSrc(src).indexOf(f._getIframeSrc(matchIframeSrc)) > -1){
                        return iframeElement;
                    }
                 }
                
                //有id匹配id
                for(let iframeElement of frameElements){
                    let id = iframeElement.id;
                    if(id)
                        noAnyPropExist = false;
                    let matchId = matchIframe.Id;
                    if(id && matchId && f._stringRegMatch(id,matchId)){
                        return iframeElement;
                    }
                }

                //有name匹配name
                 for(let iframeElement of frameElements){
                    let name = iframeElement.name;
                    if(name)
                        noAnyPropExist = false;
                    let matchName = matchIframe.Name;
                    if(name && matchName && f._stringRegMatch(name,matchName)){
                        return iframeElement;
                    }
                 }

                 //有class匹配class
                for(let iframeElement of frameElements){
                    let className = iframeElement.className;
                    if(className)
                        noAnyPropExist = false;
                    let matchClassName = matchIframe.Class;
                    if(className && matchClassName && f._stringRegMatch(className,matchClassName)){
                        return iframeElement;
                    }
                 }

                 //如果是selector来匹配，且没有属性匹配上，且frame只有一个，取这个
                 if(!mustMatchOneProp && noAnyPropExist && frameElements.length == 1){
                     return frameElements[0];
                 }
                 return null;
            }
        },

        /**
         * 获取iframe对象
         */
        getIframeElement(iframesrc,parentNode){
           return this.getIframeInfo(iframesrc,parentNode).iframeObj;
        },

        /**
         * 获取iframe的节点坐标
         * @param {*} iframeSrc 
         */
        getIframeRootPosi(iframesrc){
            return this.getIframeInfo(iframesrc).position;
        }
    }
})(window.CsCodeInspect);



(function(f){
    f.highlight = {
        _hlClassName : 'codestore-inspect-highlightNode-yqvv',
        /**
         * 高亮节点
         * @param iframesrc string
         * @param nodes Array
         */
        highlightNodes : function(iframesrc,nodes){
            if(nodes == null || nodes.length == 0) return;
            //这里有个问题：如果有iframesrc,其中parentNode在前面的步骤中，已经是在iframe本身了，所以现在是直接取parentNode的坐标就可以了。
            let frameOffset = f.iframe.getIframeRootPosi(iframesrc);
            if(nodes.length == 1){
                nodes[0].scrollIntoViewIfNeeded();//将第一个元素居中
            }
            for(var i=0;i<nodes.length;i++){
                var posiObj = getNodePosition(nodes[i],frameOffset);
                var div = document.createElement('div');
                div.className = this._hlClassName;
                div.style.position = 'absolute';
                div.style.left = `${posiObj.x}px`;
                div.style.top = `${posiObj.y}px`;
                div.style.border = '2px solid red';
                div.style.width = `${posiObj.width}px`;
                div.style.height = `${posiObj.height}px`;
                //div.style.backgroundColor = 'rgba(96,82,127,0.6)';
                div.style.zIndex = 2147483647;
                document.body.appendChild(div);                        
            }
            
        },

        hideHighlightNodes : function(){
            var nodes = document.getElementsByClassName(this._hlClassName);
            for(var i=nodes.length-1;i>-1;i--){
                document.body.removeChild(nodes[i]);
            }
        }
    }


    /**
     * 获取元素的坐标，要加上iframe的偏移
     * @param Element
     * @param Element
     */
    function getNodePosition(eleObj,frameOffset){
        let { left, top, width, height } = eleObj.getBoundingClientRect();
        if (frameOffset) {
            left += frameOffset.left;
            top += frameOffset.top;
        }
        //再加上滚动条的坐标
        left += document.body.scrollLeft;
        top += document.body.scrollTop;
        return{
                x: left,
                y: top,
                width: width,
                height: height
        }
    }
 })(window.CsCodeInspect); 

 //连续录制界面交互
 (function(f){
    f.ShowSelectDialog = {
        _selectClassName : 'codestore-inspect-selectNode-yqvv',

        /**
         * 展示下拉选择页面
         */
        show : function(posiObj,values){
            if(posiObj == null || values == null || values.length == 0) return;

            let options = '';
            for(let value of values){
                options += `<option>${value}</option>`;
            }
            var selectNodeText = `
            <div style="margin-left:10px;margin-right:10px;">
                <p style="margin-bottom:15px;">
                    <label>请选择值：</label>
                </p>
                <select style="width:85%;font-family: inherit;border: 1px solid #ccc;line-height: 1.5; border-radius: 3px;height:25px">
                    ${options}
                </select>
                <p style="margin-top:15px;">
                    <button style="float:right;font-size: 12px; border: none;height: 30px;color: #fff;background: #dd2727;width: 60px;" onclick="test()"><span>确定</span></button>
                </p>
            </div>
        `;
            //加上滚动条的高度
            var left = posiObj.left + document.body.scrollLeft;
            var top = posiObj.top +  document.body.scrollTop;
            var div = document.createElement('div');
            div.className = this._selectClassName;
            div.style.position = 'absolute';
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            div.style.border = '3px dashed #00BCD4';
            div.style.width = posiObj.width < 300 ? '300px' : `${posiObj.width}px`;
            div.style.height = `120px`;
            div.style.backgroundColor = '#eee';
            div.style.fontSize="13px";
            div.style.zIndex = 2147483647;
            div.insertAdjacentHTML('afterbegin',selectNodeText);
            document.body.appendChild(div); 

            //绑定点击事件
            f.Utils.addListener(div.getElementsByTagName("button")[0], 'click', this.confirm.bind(this));
        },

        /**
         * 获取返回值
         */
        confirm : function(){
            var divNodes = document.getElementsByClassName(this._selectClassName);
            if(divNodes.length == 0) return;
            var selectNode = divNodes[0].getElementsByTagName('select')[0];
            //取值：
            var text = selectNode.options[selectNode.selectedIndex].text ;
            f.Server.confirmSelectValue(text);
            //关闭当前页面
            this.close();
        },

        /**
         * 关闭
         */
        close:function(){
            var nodes = document.getElementsByClassName(this._selectClassName);
            //console.log('close nodes:'+nodes.length);
            for(var i=nodes.length-1;i>-1;i--){
                document.body.removeChild(nodes[i]);
            }
        }
    };

    f.ShowInputDialog = {
        _inputClassName : 'codestore-inspect-inputNode-yqvv',

        /**
         * 展示下拉选择页面
         */
        show : function(posiObj,type){
            if(posiObj == null) return;
            //如果是file,弹出来选择文件
            //否则是输入框，如果type=password,要单独处理
            if(type && type != 'password'){
                type = 'text';
            }

            var inputNodeText = `
            <div style="margin-left:8px;margin-right:5px;">
                <p">
                    <label>要输入的值:</label>
                </p>
                <p style="margin-top:15px;">
                    <input type="${type}" style="font-family: inherit;border: 1px solid #ccc;line-height: 1.5; border-radius: 3px; padding: 2px 2px; height:40px;width:85%"/></p>
                <p style="margin-top:15px;"> 
                    <span style="float:right;">按 <code style="color: #c7254e; background-color: #f9f2f4; border-radius: 4px;font-size: 90%;    padding: 2px 2px;"> 回车键 </code> 完成输入</span></p>
            </div> 
           `;
            //加上滚动条的高度
            var left = posiObj.left + document.body.scrollLeft;
            var top = posiObj.top +  document.body.scrollTop;
            var div = document.createElement('div');
            div.className = this._inputClassName;
            div.style.position = 'absolute';
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            div.style.border = '3px dashed #00BCD4';
            div.style.width = posiObj.width < 300 ? '300px' : `${posiObj.width}px`;
            div.style.height = `130px`;
            div.style.backgroundColor = '#eee';
            div.style.zIndex = 2147483647;
            div.insertAdjacentHTML('afterbegin',inputNodeText);
            document.body.appendChild(div); 

            //绑定点击事件
            //console.log(document.getElementsByClassName(this._inputClassName)[0]);
            var $input = document.getElementsByClassName(this._inputClassName)[0].querySelector(`input[type="${type}"]`);
            $input.focus();
            f.Utils.addListener($input, 'keypress', this.confirm.bind(this));
        },

        /**
         * 获取返回值
         */
        confirm : function(e){
            if (e.keyCode == 13) {
                var value = document.getElementsByClassName(this._inputClassName)[0].querySelector('input').value;
                //var override = document.getElementsByClassName(this._inputClassName)[0].querySelector('input[type="checkbox"]').checked;
                f.Server.confirmInputValue(value,true);
                //关闭当前页面
                this.close();
            }
        },

        /**
         * 关闭
         */
        close:function(){
            var nodes = document.getElementsByClassName(this._inputClassName);
            for(var i=nodes.length-1;i>-1;i--){
                document.body.removeChild(nodes[i]);
            }
        }

    };

    f.ShowDataListDialog = {
        _className : 'codestore-inspect-tableNode-yqvv',

        show:function(dataObj){
            var nodeText = `
            <div>
                <p style="margin-top: 1px;padding: 5px 5px;background: #03A9F4; border-bottom: 1px solid #eee;font-size:15px;">提取的数据</p>
                <p style="padding: 2px 10px;border-bottom: 1px solid #eee;background:linear-gradient(180deg,#efeff0,#e8e8e8)">找到多条数据，选择</p>
                <div style="height:160px;">
                    <table border="1" cellspacing="0" cellpadding="0">
                    </table>
                </div>
                <p style="margin-top:15px;">
                    <button name="completeInspect" style="margin-left:240px;font-size: 12px; border: none;height: 30px;color: #fff;background: #03A9F4;width: 60px;margin-right:10px;"><span>完成</span></button>
                    <button name="continueInspect" style="font-size: 12px; border: none;height: 30px;color: #fff;background: #03A9F4;width: 60px;margin-right:10px;"><span>继续录制</span></button>
                </p>
            </div>
           `;

            //列表数据展示 todo
            //console.log(dataObj);

            //加上滚动条的高度
            var top = CsCodeInspect._getWindowViewHight()/2 + document.body.scrollTop;
            var div = document.createElement('div');
            div.className = this._className;
            div.style.position = 'absolute';
            var viewWidth = CsCodeInspect._getWindowViewWidth()-400;
            div.style.left = `${viewWidth}px`;
            div.style.top = `${top}px`;
            div.style.border = '3px dashed #00BCD4';
            div.style.width =`400px`;
            div.style.height = `300px`;
            div.style.backgroundColor = '#eee';
            div.style.zIndex = 2147483647;
            div.insertAdjacentHTML('afterbegin',nodeText);
            document.body.appendChild(div); 

            //填充数据
            let tableObj = div.querySelector('table');
            let dataListObj = JSON.parse(dataObj.dataList);
            var trs = '';
            for(let dataRow of dataListObj){
                var tr = `<tr>`;
                for(let key in dataRow){
                    let td = dataRow[key];
                    tr += `<td>${td}</td>`;
                }
                tr += `</tr>`;
                trs += tr;
            }
            tableObj.innerHTML = trs;

            //绑定点击事件
            f.Utils.addListener(div.querySelector('button[name="completeInspect"]'), 'click', this.confirm.bind(this));
            f.Utils.addListener(div.querySelector('button[name="continueInspect"]'), 'click', () => {
                //先关闭当前窗口
                this.close();
                //取消高亮
                f.highlight.hideHighlightNodes()
                //继续录制
                f.Server.continueInspect();
            });
        },
        
        confirm:function(e){
            //先关闭当前窗口
            this.close();
            //取消高亮
            f.highlight.hideHighlightNodes();
            //问，是否要录制下一页，针对已录制多个元素情况下。
            /*let isPaging = confirm("是否要分页处理？");
            if(!isPaging){
                //完成
                f.Server.completeDataListInspect();
            }else{

            }*/
            f.Server.completeDataListInspect();
        },

        close:function(){
            var nodes = document.getElementsByClassName(this._className);
            for(var i=nodes.length-1;i>-1;i--){
                document.body.removeChild(nodes[i]);
            }
            f.highlight.hideHighlightNodes();
        }
    }

 })(window.CsCodeInspect);

/**
 * 工具类
 */
(function(f){
    f.Utils = {
        addListener : function(element, eventName, handler){
            if (element.addEventListener) {
                element.addEventListener(eventName, handler, false);
            }
            else if (element.attachEvent) {
                element.attachEvent('on' + eventName, handler);
            }
            else {
                element['on' + eventName] = handler;
            }
        },

        removeListener : function(element, eventName, handler){
            if (element.addEventListener) {
                element.removeEventListener(eventName, handler, false);
            }
            else if (element.detachEvent) {
                element.detachEvent('on' + eventName, handler);
            }
            else {
                element['on' + eventName] = null;
            }
        },

        string2Binary(str) {
            if(!str) return "0x";
            try{
                hex = unescape(encodeURIComponent(str))
                .split('').map(function(v){
                    return v.charCodeAt(0).toString(16)
                }).join('');
            }
            catch(e){
                hex = str
                //console.log('invalid text input: ' + str);
            }
            return hex;
        }
    };
})(window.CsCodeInspect);


/**
 * cef交互
 */
(function(f){
    f.Server = {
        cefQuery : function(method,param,callback,isNeedHexToString){
            //var req = `{"IsAsync": true, "Method": "${method}", "Params": "${param}"}`;
            var req = {
                IsAsync : true,
                Method : method,
                Params : param
            };

            window.cefQuery({
                request: WebInspector.DOMPresentationUtils.toJSON(req),
                onSuccess: function(response) {
                    if(callback)
                        callback(response);
                },
                onFailure: function(err, msg) {
                   console.log('error:'+msg);
                }
            });  
        },

        confirmSelectValue : function(value){
            this.cefQuery("SelectAction_afterSelect",f.Utils.string2Binary(value),null,true);
        },

        confirmInputValue : function(value,isOverride){
            var data = {
                text : f.Utils.string2Binary(value),
                isOverride : isOverride
            };
            this.cefQuery("InputAction_afterInput",WebInspector.DOMPresentationUtils.toJSON(data),null,true);
        },

        continueInspect : function(){
            this.cefQuery("DataAction_next",'1',null,true);
        },

        completeDataListInspect : function(){
            this.cefQuery("DataAction_end",'1',null,true);
        },

        pageInspect:function(){
             this.cefQuery("DataAction_pageInspect",'1',null,true);
        }
    }
})(window.CsCodeInspect);

/**
 * 找元素
 */
(function(f){
    f.Element = {
        /**
         * 换列表的总数
         */
        findDataListCount : function(dataObj){
            if(!dataObj) return null;
            let iframe = dataObj.Iframe;
            let parentPath = dataObj.ParentPath;
            let childPathObj = JSON.parse(dataObj.ChildNodes);

            let target = WebInspector.DOMPresentationUtils.findTargetDocument(iframe);
            let count = 0;
            if(parentPath){
                let parentNodes = target.querySelectorAll(parentPath);
                for(let parentNode of parentNodes){
                    //检查parentNode是否至少有一个
                    let isExistAnyNode = false;
                    if(childPathObj.length == 0){
                        isExistAnyNode = true;
                        continue;
                    }
                    //检查子元素
                    for(let j =0;j < childPathObj.length; j++){
                        let childNode = findNodeBySelectorAndText(childPathObj[j],parentNode);
                        if(childNode) {
                            isExistAnyNode = true;
                            break;
                        }
                    }
                    if(isExistAnyNode) 
                        count++;
                }
            }else{
                let childNodes = findNodesBySelectorAndText(childPathObj[0],target);
                count = childNodes.length;
            }
            return count;
        },

        /**
         * 列表中的元素做操作
         */
        doDataListAction : function(dataObj){
            if(!dataObj) return null;
            let nodeIndex = dataObj.nodeIndex;//实际处理应该是nodeIndex-1
            let fieldName = dataObj.field;
            let action = dataObj.action;
            let elementObj = dataObj.element; //actionValue

            //elementObj下的内容
            let iframe = elementObj.Iframe;
            let parentPath = elementObj.ParentPath;
            let childPathObj = JSON.parse(elementObj.ChildNodes);
            let columnNames = elementObj.columnNames;
            let columnnArray = new Array();
            if(columnNames){
                columnnArray = columnNames.split(',');
            }

            //根据fieldName找fieldIndex
            let fieldIndex = -1;
            for(let i=0;i<columnnArray.length;i++){
                if(columnnArray[i] == fieldName){
                    fieldIndex = i;
                }
            }
            let target = WebInspector.DOMPresentationUtils.findTargetDocument(iframe);

            //一、找元素
            let eleObj;
            let targetParentNode = target;
            //检验列有无超出。
            if(fieldIndex < 0 || (childPathObj.length == 0 && fieldIndex > 0) || fieldIndex >= childPathObj.length){
                return -2;
            }

            //找元素
            if(parentPath){
                let parentNodes = target.querySelectorAll(parentPath);
                //如果只有一列，不需要，校验空
                if(childPathObj.length == 0){
                    eleObj = parentNodes[nodeIndex-1];
                }else{
                    //注意下标，清空之前没有元素的：这是以防有的前后或中间有几个是不符合，系统智能去除
                    let rightNodeCount = 0;//找到满足的元素个数,当rightNodeCount=nodeIndex时就返回
                    for(let parentNode of parentNodes){
                        //检查子元素
                        let isExistAnyNode = false;
                        for(let j =0;j < childPathObj.length; j++){
                            let childNode = findNodeBySelectorAndText(childPathObj[j],parentNode);
                            if(childNode) {
                                isExistAnyNode = true;
                                break;
                            }
                        }
                        //parentNode是否保留
                        if(isExistAnyNode){
                            rightNodeCount ++;
                        }
                        //找到了
                        if(rightNodeCount == nodeIndex){
                            eleObj = findNodeBySelectorAndText(childPathObj[fieldIndex],parentNode);
                            targetParentNode = parentNode;
                            break;
                        }
                    }
                }
            }else{
                let childNodes = findNodesBySelectorAndText(childPathObj[0],target);
                eleObj = childNodes[nodeIndex-1];
            }


            //二、操作元素
            if(eleObj == null) return -1;
            switch(action){
                case 'focus':
                    f.Node.focus(eleObj);
                    return '1';
                case 'input':
                    f.Node.input(eleObj,dataObj.actionValue);
                    return '1';
                case 'click':
                   f.Node.click(eleObj);
                    return '1';
                case 'getText':
                    return f.Node.getText(eleObj);
                case 'getCode':
                    return f.Node.getCode(eleObj);
                case 'getLink':
                    return f.Node.getLink(eleObj);
                case 'getPosition':
                    return f.Node.getPosition(eleObj,iframe,targetParentNode);
                case 'check':
                    f.Node.check(eleObj);
                    return '1';
                case 'uncheck':
                    f.Node.uncheck(eleObj);
                    return '1';
                case 'optionClick':
                    f.Node.optionClick(eleObj,dataObj.actionValue)
                    return '1';
            }

            return '0';
        },

        /**
         * 找元素
         */
        findDataList : function(dataObj){
            if(!dataObj) return null;
            let iframe = dataObj.Iframe;
            let parentPath = dataObj.ParentPath;
            let childPaths = dataObj.ChildNodes;
            let childPathObj = JSON.parse(childPaths);
            let columnNames = dataObj.columnNames;

            //先找target
            let target = WebInspector.DOMPresentationUtils.findTargetDocument(iframe);
            //找所有的父元素
            let parentNodes = new Array();
            let resultList = "";
            let row = 0;
            if(parentPath){
                parentNodes = target.querySelectorAll(parentPath);
                if(parentNodes.length == 0){
                    return null;
                }
                //为了复用之前的方法，这里要用字符串拼接
                for(let parentNode of parentNodes){
                    //let dataObj = new Object();
                    //没有子元素
                    let thisResult = "";
                    let isExistAnyNode = false;
                    if(childPathObj.length == 0){
                         let nodeText = parentNode.textContent || parentNode.outerText;
                         thisResult += '"' + CsCodeInspect._base64Encode(nodeText) + '"';
                         isExistAnyNode = true;
                    }

                    //找元素
                    for(let j =0;j < childPathObj.length; j++){
                        let childNode = findNodeBySelectorAndText(childPathObj[j],parentNode);
                        if(childNode) isExistAnyNode = true;
                        let childNodeText = childNode == null ? "" : childNode.textContent || childNode.outerText;
                        thisResult += '"' + CsCodeInspect._base64Encode(childNodeText) + '"';
                    }

                    //生成结果：
                    if(isExistAnyNode){
                        row++;
                        resultList += '{"data' + row + '":' +thisResult + "}";
                    }
                }
            }else{
                let childNodes = findNodesBySelectorAndText(childPathObj[0],target);
                if(!childNodes) return null;
                for(let childNode of childNodes){
                    resultList += '{"data' + row + '":';
                    let childNodeText = childNode.textContent || childNode.outerText;
                    resultList += '"' + CsCodeInspect._base64Encode(childNodeText) + '"';
                    row++;
                    resultList += "}";
                }
            }
           return resultList;
        },

        /**
         * 找元素并高亮
         */
        findDataListAndHighlight : function(dataObj){
            if(!dataObj) return null;
            CsCodeInspect.highlight.hideHighlightNodes(); 
            let iframe = dataObj.Iframe;
            let parentPath = dataObj.ParentPath;
            let childPaths = dataObj.ChildNodes;
            if(typeof childPaths === 'string'){
                childPaths = JSON.parse(childPaths);
            }
            let columnCount = 0;
            let columnNames = dataObj.columnNames;
            let childcount = childPaths.length == 0 ? 1 :childPaths.length;
            if(!columnNames || columnNames.length == 0){
                columnNames = new Array();
                for(let i=0;i<childcount;i++){
                    columnNames.push(`data${i}`);
                }
            }
            let lastChildActionName = "";//最后录制的一个元素，默认的动作

            //先找target
            let target = WebInspector.DOMPresentationUtils.findTargetDocument(iframe);

            let allNodes = new Array();
            let dataList = new Array();
            //找所有的父元素
            let listType = "1";//1--代表多个parentNodes块，2--代表只有1个parentNode块
            if(parentPath){
                let parentNodes = target.querySelectorAll(parentPath);     
                columnCount = childPaths.length;                
                for(let parentNode of parentNodes){
                    let dataObj = new Object();
                    //没有子元素：
                    if(columnCount == 0){
                         let nodeText =  findNodeShowText(parentNode);
                         dataObj[columnNames[0]] = nodeText;
                         allNodes.push(parentNode);
                         dataList.push(dataObj);

                         if(!lastChildActionName)
                            lastChildActionName = getDefaultAction(parentNode);
                         continue;
                    }

                    //找元素,是否全null,如果全null,不加入
                    let isExistAnyNode = false;
                    for(let j = 0;j < childPaths.length; j++){
                        let childNode = findNodeBySelectorAndText(childPaths[j],parentNode);
                        let childNodeText = findNodeShowText(childNode);
                        dataObj[columnNames[j]] = childNodeText;
                        if(childNode){
                            isExistAnyNode = true;
                            allNodes.push(childNode);
                            if(!lastChildActionName && j == childPaths.length -1)
                                lastChildActionName = getDefaultAction(childNode);
                        }
                    }
                    if(isExistAnyNode)
                        dataList.push(dataObj);
                }
            }else{
                //parentNodes.push(target);
                //这里应该是只有一个元素
                columnCount = 1;
                let childNodes = findNodesBySelectorAndText(childPaths[0],target);
                if(!childNodes) return null;
                for(let childNode of childNodes){
                    let childNodeText = findNodeShowText(childNode);
                     let dataObj = new Object();
                     dataObj[columnNames[0]] = childNodeText
                     dataList.push(dataObj);
                     allNodes.push(childNode);
                }
                lastChildActionName = getDefaultAction(childNodes[0]);
            }



            //高亮显示
            let count = 0;
            doHighlight();

            let rs = {
                columnCount : columnCount,
                datas : dataList,
                lastChildActionName : lastChildActionName
            }
            return WebInspector.DOMPresentationUtils.toJSON(rs);

            function doHighlight(){
                if(count%2 == 0){
                    CsCodeInspect.highlight.highlightNodes(iframe,allNodes);
                }else{
                    CsCodeInspect.highlight.hideHighlightNodes(); 
                }
            }

            /**
             * 获取默认的动作
             */
            function getDefaultAction(node){
                 let lowerCaseName = node.localName || node.nodeName.toLowerCase();
                if(lowerCaseName === 'img')
                    return 'getLink';
                //如果是输入框，且非readonly,需要用输入
                if(isInputNode(node))
                    return 'input';
                return 'getText'
            }


            function isInputNode(nodeObj){
                if(nodeObj.readOnly)
                    return false;

                var tagName = nodeObj.nodeName.toLowerCase();
                if(tagName.toLowerCase() === "textarea")
                    return true;

                if(tagName.toLowerCase() === "input"){
                    var type = nodeObj['type'];
                    var canArray = ["email","url","number","range","date","search","password","text","month","week","time","datetime","datetime-local"];
                    if(!type || canArray.indexOf(type) > -1)
                        return true;
                }
                return false;
            }

        }
    };

    /**
     * 如果超过10，截取前10个字符
     */
    function findNodeShowText(node){
        if(!node) return '';

        let nodeText = '';
        //如果是img，获取链接
        let lowerCaseName = node.localName || node.nodeName.toLowerCase();
        if(lowerCaseName === 'img'){
            nodeText = node.src;
        }else{
            nodeText = node.textContent || node.outerText;
            nodeText = nodeText.replace(/[\r\n\t]/g,"").replace(/(^\s*)|(\s*$)/g,"")
        }

        //只取前50个字，要不太多了
        if(nodeText.length > 80){
            nodeText = nodeText.substring(0,50) + '...';
        }
        return nodeText;
    }

    /**
     * 根据selector+text找元素
     */
    function findNodeBySelectorAndText(pathObj,parentNode){
        nodes = WebInspector.DOMPresentationUtils.querySelector(extractSelector(pathObj),parentNode);
        //一般来说，不会是多个，如果是多个，怎么办？
        if(!nodes) return null;
        return nodes[0];
    }

    function findNodesBySelectorAndText(pathObj,parentNode){
        nodes = WebInspector.DOMPresentationUtils.querySelector(extractSelector(pathObj),parentNode);
        //一般来说，不会是多个，如果是多个，怎么办？
        if(!nodes) return null;
        return nodes;
    }


    function extractSelector(pathObj){
        let text = pathObj.text;
        let cssPath = pathObj.optimizedCssPath;
        if(text){
            cssPath += `:contains("${text}")`;
        } 
        return cssPath;
    }

})(window.CsCodeInspect);

(function(f){
    f.Table ={
        findTable : function(){
             //文本,type=1是文本，2是html
            if (arguments.length != 1) {
                return "0";
            }
            if (!CsCodeInspect._isJsonObj(arguments[0])) {
                return "0";
            }
            var jsonObj = arguments[0];
            var matcherValue = jsonObj.matcherValue; //序号
            if (CsCodeInspect._emptyStr(matcherValue)) {
                matcherValue = 1;
            }
            var tables = getAllTable(jsonObj);
            if (tables == null || tables.length == 0) {
                return "-1";
            }

            //匹配表格
            return matchTable(tables,jsonObj.matcherType,jsonObj.matcherValue,jsonObj.returnType);
        }
    }

    function matchTable(tables,matcherType,matcherValue,returnType){
        for (var item = 0; item < tables.length; item++) {
            let matched = false;
            switch(matcherType){
                case 'index':
                    if (item == matcherValue - 1) 
                        matched = true;
                    break;
                case 'text':
                    if (CsCodeInspect._stringRegMatch(tables[item].outerText, matcherValue))
                        matched = true;
                    break;
                case 'html':
                    if (CsCodeInspect._stringRegMatch(tables[item].outerHTML, matcherValue))
                        matched = true;
                    break;
                default:
                    return 0;
            }

            if (matched) {
                return readFromTable(tables[item],returnType);
            }
        }

        return 0
    }

    /**
     * 找出所有的表格
     */
    function getAllTable(jsonObj){
        let parentNode = CsCodeInspect._getParentObj(jsonObj);
        if (parentNode == null) {
           parentNode = document;
        }

        var elements = new Array();
        var tables = CsCodeInspect._getTagNameCollection(parentNode, 'table');
        for (var j = 0; j < tables.length; j++) {
            elements.push(tables[j]);
        }

        if(parentNode == document){
            try {
                //再从iframe中找
                var iframes = document.getElementsByTagName("iframe");
                for (var i = 0; i < iframes.length; i++) {
                    var iframeObj = iframes[i];
                    var tables = iframeObj.contentWindow.document.getElementsByTagName("table");
                    for (var j = 0; j < tables.length; j++) {
                        elements.push(tables[j]);
                    }
                }
            } catch (e) {

            }
        }

        return elements;
    }



    function readFromTable(tableEle,returnType){
        if (tableEle == null) {
            return "";
        }

        var result = ""; //返回的串
        let rowSpanDatas = [];//rowspan的相关信息
        
        var rows = tableEle.rows;
        let _colInx = 0;
        for (var item = 0; item < rows.length; item++) {
            var row = rows[item]
            var tds = row.cells;
            //找到匹配到的rowspan信息
            let datasFromRowSpan = [];
            if(rowSpanDatas.length > 0){
                datasFromRowSpan = tdsFromRowSpan(item)
            }

            var tag = "row" + item;
            result += '{"' + tag + '":';
            _colInx = 0;//不算rowspan的列序号
             result += dataFromTdRowSpan(datasFromRowSpan,1,0);
            for (var tdItem = 0; tdItem < tds.length; tdItem++) {
                 result += dataFromTdRowSpan(datasFromRowSpan,2,_colInx);
                let v = ""
                switch(returnType){
                    case '1':
                        v = CsCodeInspect._base64Encode(tds[tdItem].outerText);
                        break;
                    case '2':
                        v = CsCodeInspect._base64Encode(tds[tdItem].outerHTML);
                        break;

                }
                result += '"' + v + '"';

                //处理rowspan:
                let rowspan = tds[tdItem].rowSpan;
                if(rowspan != null && rowspan > 1){
                    rowSpanDatas.push({
                        col : _colInx,
                        row : item,
                        rowspan : rowspan,
                        value : v
                    });
                }

                //处理colspan
                var colspan = tds[tdItem].colSpan;
                if (colspan != null && colspan > 1) {
                    for (var j = 0; j < colspan-1; j++) {
                        result += '""';
                        _colInx++;
                    }
                }
                _colInx++;
            }
            //有无尾巴要补
            result += dataFromTdRowSpan(datasFromRowSpan,3,_colInx);
            result += "}";
        }
        return result;

        /**
         * 先根据行号计算，此行有几个要处理的rowspan信息
         */
        function tdsFromRowSpan(row){
            let array = [];
            for(let data of rowSpanDatas){
                if(data.row >= row)
                    continue;
                if(row - data.row + 1 <= data.rowspan){
                    array.push({
                        col : data.col,
                        value : data.value
                    });
                }
            }
            return array;
        }

        /**
         * 补充rowspan的数据，有三种规则：
         * 规则1：表格前面列的rowspan
         * 规则2：插入到已有列中间
         * 规则3：尾部合并的rowspan
         */
        function dataFromTdRowSpan(datasFromRowSpan,type,col){
            if(datasFromRowSpan.length == 0)
                return "";

            let result = "";
            switch(type){
                case 1:
                    let _idx = 0
                    while(true){
                        let matched = false;
                        for(let data of datasFromRowSpan){
                            if(data.col == _idx){
                                _colInx++;//针对上面
                                result += '"' + data.value + '"';
                                matched = true;
                                break;
                            }
                        }

                        if(!matched)
                            break;
                        _idx++;//针对本次，处理完前面所有的rowspan行
                    }
                    break;
                case 2:
                    for(let data of datasFromRowSpan){
                        if(data.col == col){
                            _colInx++;
                            result += '"' + data.value + '"';
                            break;
                        }
                    }
                    break;
                case 3:
                    for(let data of datasFromRowSpan){
                        if(data.col+1 > col){ //这里为什么要+1，因为data.col取时从0开始的，而type=3在所有列处理完后，是总数量。所以要加1
                            _colInx++;
                            result += '"' + data.value + '"';
                        }
                    }
                    break;
                default:
                    return "";
            }
            return result;
        }
    }

})(window.CsCodeInspect);

/**
 * 元素动作方法
 */
(function(f){
    f.Node = {
        focus:function(eleObj){
            if(eleObj){
                eleObj.focus();
                eleObj.value = "";
            }
        },

        input : function(eleObj,actionValue){
            if(eleObj){
                eleObj.focus();
                let tagName = eleObj.nodeName.toLowerCase();
                if (tagName == "input" || tagName == "textarea" || tagName == "select") {
                    eleObj.value = eleObj.value + actionValue;
                } else {
                    eleObj.innerText = eleObj.innerText + actionValue
                }
            }
        },

        click:function(eleObj){
            if(eleObj){
                eleObj.click();
            }
        },

        check : function(eleObj){
            if (eleObj && !eleObj.checked) {
                eleObj.click();
            }
        },

        uncheck : function(eleObj){
            if(eleObj && eleObj.checked){
                eleObj.click();
            }
        },

        /**
         * 获取a,imag超链接
         */
        getLink : function(eleObj){
            /*if(eleObj){
                let code = eleObj.outerHTML.replace(/\r/g, "").replace(/\n/g, "").replace(/\t/g, "")
                let alinkRes = code.match(/href\s*=\s*"(\S+)"/);
                if(alinkRes)  
                    return alinkRes[1];
                let srcLinkRes = code.match(/src\s*=\s*"(\S+)"/);
                if(srcLinkRes)
                    return srcLinkRes[1];
            }*/
            if(eleObj){
                return eleObj.href || eleObj.src;
            }
            return '';
        },

        getText : function(eleObj){
            if(!eleObj) return '';
            return eleObj.outerText || eleObj.value
        },

        getCode : function(eleObj){
            if(!eleObj) return '';
            return eleObj.outerHTML.replace(/\r/g, "").replace(/\n/g, "").replace(/\t/g, "")
        },

        /**
         * 获取元素坐标
         */
        getPosition : function(eleObj,iframeSrc,parentNode){
            if(!eleObj) return 0;
            eleObj.scrollIntoViewIfNeeded();
            let { left, top, width, height } = eleObj.getBoundingClientRect();
            if(iframeSrc){
                let frameOffset = CsCodeInspect.iframe.getIframeRootPosi(iframeSrc);
                if(frameOffset){
                    left += frameOffset.left;
                    top += frameOffset.top;
                }
            }
            let centerX = left + 1/2 * width;
            let centerY = top + 1/2 * height;
            return WebInspector.DOMPresentationUtils.toJSON({
                x: String(centerX),
                y: String(centerY)
            });
        },

        optionClick : function(eleObj,optionValue){
            if(!eleObj) return;

            let array = CsCodeInspect._getTagNameCollection(eleObj, "option");
            if (array == null || array.length == 0) {
                return;
            }

            for (var item = 0; item < array.length; item++) {
                var itemText = CsCodeInspect._trim(array[item].outerText);
                if (itemText == optionValue) {
                    eleObj.focus();
                    array[item].selected = true;
                    array[item].focus();
                    array[item].click();
                    CsCodeInspect._triggerEvent(eleObj, 'change');
                }
            }
        },
        /**
         * 判断某个元素有无在页面中可见
         */
        isDisplayed : function(eleObj){
            if(!eleObj) return 0;
            let node = eleObj;
            while(node && node.nodeType == 1){
                let display = getComputedStyle(node)["display"];
                if(display == '' || display == 'none')
                    return 0;
                node = node.parentNode;
            }
            return 1;
        }
    }
})(window.CsCodeInspect);