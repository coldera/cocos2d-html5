/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

cc.BuilderAnimationManagerDelegate = cc.Class.extend({
    completedAnimationSequenceNamed:function (name) {}
});

cc.BuilderAnimationManager = cc.Class.extend({
    _sequences:null,
    _nodeSequences:null,
    _baseValues:null,
    _autoPlaySequenceId:0,

    _rootNode:null,
    _rootContainerSize:null,

    _delegate:null,
    _runningSequence:null,

    _documentOutletNames:null,
    _documentOutletNodes:null,
    _documentCallbackNames:null,
    _documentCallbackNodes:null,
    _documentControllerName:"",
    _lastCompletedSequenceName:"",

    _animationCompleteCallbackFunc:null,
    _target:null,

    ctor:function () {
        this._rootContainerSize = cc.size(0, 0);
        this.init();
    },

    init:function () {
        this._sequences = [];
        this._nodeSequences = new cc._Dictionary();
        this._baseValues = new cc._Dictionary();

        this._documentOutletNames = [];
        this._documentOutletNodes = [];
        this._documentCallbackNames = [];
        this._documentCallbackNodes = [];

        return true;
    },

    getSequences:function () {
        return this._sequences;
    },

    getAutoPlaySequenceId:function () {
        return this._autoPlaySequenceId;
    },
    setAutoPlaySequenceId:function (autoPlaySequenceId) {
        this._autoPlaySequenceId = autoPlaySequenceId;
    },

    getRootNode:function () {
        return this._rootNode;
    },
    setRootNode:function (rootNode) {
        this._rootNode = rootNode;
    },

    addDocumentCallbackNode:function(node){
        this._documentCallbackNodes.push(node);
    },

    addDocumentCallbackName:function(name){
        this._documentCallbackNames.push(name);
    },

    addDocumentOutletNode:function(node){
        this._documentOutletNodes.push(node);
    },

    addDocumentOutletName:function(name){
        this._documentOutletNames.push(name);
    },

    setDocumentControllerName:function(name){
        this._documentControllerName = name;
    },

    getDocumentControllerName:function(){
        return this._documentControllerName;
    },

    getDocumentCallbackNames:function(){
        return this._documentCallbackNames;
    },

    getDocumentCallbackNodes:function(){
        return this._documentCallbackNodes;
    },

    getDocumentOutletNames:function(){
        return this._documentOutletNames;
    },

    getDocumentOutletNodes:function(){
        return this._documentOutletNodes;
    },

    getLastCompletedSequenceName:function(){
        return this._lastCompletedSequenceName;
    },

    getRootContainerSize:function () {
        return this._rootContainerSize;
    },
    setRootContainerSize:function (rootContainerSize) {
        this._rootContainerSize = cc.size(rootContainerSize.width, rootContainerSize.height);
    },

    getDelegate:function () {
        return this._delegate;
    },
    setDelegate:function (delegate) {
        this._delegate = delegate;
    },

    getRunningSequenceName:function () {
        return this._runningSequence.getName();
    },

    getContainerSize:function (node) {
        if (node)
            return node.getContentSize();
        else
            return this._rootContainerSize;
    },

    addNode:function (node, seq) {
        this._nodeSequences.setObject(seq, node);
    },
    setBaseValue:function (value, node, propName) {
        var props = this._baseValues.objectForKey(node);
        if (!props) {
            props = new cc._Dictionary();
            this._baseValues.setObject(props, node);
        }
        props.setObject(value, propName);
    },

    moveAnimationsFromNode:function(fromNode,toNode){
        // Move base values
        var baseValue = this._baseValues.objectForKey(fromNode);
        if(baseValue != null) {
            this._baseValues.setObject(baseValue, toNode);
            this._baseValues.removeObjectForKey(fromNode);
        }

        // Move seqs
        var seqs = this._nodeSequences.objectForKey(fromNode);
        if(seqs != null) {
            this._nodeSequences.setObject(seqs, toNode);
            this._nodeSequences.removeObjectForKey(fromNode);
        }
    },

    runAnimationsForSequenceNamed:function(name){
        this.runAnimations(name);
    },

    runAnimations:function (name, tweenDuration) {
        var nSeqId;
        if(typeof(name) === "string")
            nSeqId = this._getSequenceId(name);
        else
            nSeqId = name;

        cc.Assert(nSeqId != -1, "Sequence id couldn't be found");

        this._rootNode.stopAllActions();

        var allKeys = this._nodeSequences.allKeys();
        for(var i  = 0 ; i< allKeys.length;i++){
            var node = allKeys[i];
            node.stopAllActions();

            var seqs = this._nodeSequences.objectForKey(node);
            var seqNodeProps = seqs.objectForKey(nSeqId);
            var j;
            var seqNodePropNames = [];
            if(seqNodeProps){
                var propKeys = seqNodeProps.allKeys();
                for(j = 0; j < propKeys.length; j++){
                    var propName = propKeys[j];
                    var seqProp = seqNodeProps.objectForKey(propName);
                    seqNodePropNames.push(propName);

                    this._setFirstFrame(node, seqProp,tweenDuration);
                    this._runAction(node,seqProp,tweenDuration);
                }
            }

            var nodeBaseValues = this._baseValues.objectForKey(node);
            if(nodeBaseValues){
                var baseKeys = nodeBaseValues.allKeys();
                for(j = 0; j < baseKeys.length;j++){
                    var selBaseKey =  baseKeys[j];
                    if(seqNodePropNames.indexOf(selBaseKey) == -1){
                        var value = nodeBaseValues.objectForKey(selBaseKey);
                        if(value != null)
                            this._setAnimatedProperty(selBaseKey,node, value, tweenDuration);
                    }
                }
            }
        }

        // Make callback at end of sequence
        var seq = this._getSequence(nSeqId);
        var completeAction = cc.Sequence.create(cc.DelayTime.create(seq.getDuration() + tweenDuration),
            cc.CallFunc.create(this._sequenceCompleted,this));
        this._rootNode.runAction(completeAction);
        // Set the running scene
        this._runningSequence = this._getSequence(nSeqId);
    },

    setAnimationCompletedCallback:function(target,callbackFunc){
        this._target = target;
        this._animationCompleteCallbackFunc = callbackFunc;
    },

    setCompletedAnimationCallback:function(target,callbackFunc){
        this.setAnimationCompletedCallback(target,callbackFunc);
    },

    debug:function () {
    },

    _getBaseValue:function (node, propName) {
        var props = this._baseValues.objectForKey(node);
        if (props)
            return props.objectForKey(propName);
        return null;
    },

    _getSequenceId:function (sequenceName) {
        var element = null;
        for (var i = 0; i < this._sequences.length; i++) {
            element = this._sequences[i];
            if (element && element.getName() == sequenceName)
                return element.getSequenceId();
        }
        return -1;
    },

    _getSequence:function (sequenceId) {
        var element = null;
        for (var i = 0; i < this._sequences.length; i++) {
            element = this._sequences[i];
            if (element && element.getSequenceId() === sequenceId)
                return element;
        }
        return null;
    },

    _getAction:function (keyframe0, keyframe1, propName, node) {
        var duration = keyframe1.getTime() - (keyframe0 ? keyframe0.getTime() : 0);
        var getArr,type,getValueArr, x, y;

        if (propName === "rotation") {
            return cc.BuilderRotateTo.create(duration, keyframe1.getValue());
        } else if (propName === "opacity") {
            return cc.FadeTo.create(duration, keyframe1.getValue());
        } else if (propName === "color") {
            var selColor = keyframe1.getValue().getColor();
            return cc.TintTo.create(duration, selColor.r, selColor.g, selColor.b);
        } else if (propName === "visible") {
            var isVisible = keyframe1.getValue();
            if (isVisible) {
                return cc.Sequence.create(cc.DelayTime.create(duration), cc.Show.create());
            } else {
                return cc.Sequence.create(cc.DelayTime.create(duration), cc.Hide.create());
            }
        } else if (propName === "displayFrame") {
            return cc.Sequence.create(cc.DelayTime.create(duration), cc.BuilderSetSpriteFrame.create(keyframe1.getValue()));
        } else if(propName === "position"){
            getArr = this._getBaseValue(node,propName);
            type = getArr[2];

            //get relative position
            getValueArr = keyframe1.getValue();
            x = getValueArr[0];
            y = getValueArr[1];

            var containerSize = this.getContainerSize(node.getParent());

            var absPos = cc.getAbsolutePosition(cc.p(x,y), type,containerSize,propName);

            return cc.MoveTo.create(duration,absPos);
        } else if( propName === "scale"){
            getArr = this._getBaseValue(node,propName);
            type = getArr[2];

            //get relative position
            getValueArr = keyframe1.getValue();
            x = getValueArr[0];
            y = getValueArr[1];

            if(type == CCB_SCALETYPE_MULTIPLY_RESOLUTION)
                 var resolutionScale = cc.BuilderReader.getResolutionScale();
            return cc.ScaleTo.create(duration,x,y);
        } else {
            cc.log("BuilderReader: Failed to create animation for property: " + propName);
        }
        return null;
    },

    _setAnimatedProperty:function (propName, node, value, tweenDuration) {
        if(tweenDuration > 0){
            // Create a fake keyframe to generate the action from
            var kf1 = new cc.BuilderKeyframe();
            kf1.setValue(value);
            kf1.setTime(tweenDuration);
            kf1.setEasingType(CCB_KEYFRAME_EASING_LINEAR);

            // Animate
            var tweenAction = this._getAction(null, kf1, propName, node);
            node.runAction(tweenAction);
        } else {
            // Just set the value
            var getArr, nType, x,y;
            if(propName === "position"){
                getArr = this._getBaseValue(node,propName);
                nType = getArr[2];

                x = value[0];
                y = value[1];
                node.setPosition(cc.getAbsolutePosition(cc.p(x,y),nType, this.getContainerSize(node.getParent()),propName));
            }else if(propName === "scale"){
                getArr = this._getBaseValue(node,propName);
                nType = getArr[2];

                x = value[0];
                y = value[1];

                cc.setRelativeScale(node,x,y,nType,propName);
            }else {
                // [node setValue:value forKey:name];

                // TODO only handle rotation, opacity, displayFrame, color
                if(propName === "rotation"){
                    //var rotate = ((CCBValue*)pValue).getFloatValue();
                    node.setRotation(value);
                } else if(propName === "opacity"){
                    //var opacity = ((CCBValue*)pValue).getByteValue();
                    node.setOpacity(value);
                } else if(propName === "displayFrame"){
                    node.setDisplayFrame(value);
                } else if(propName === "color"){
                    //var color = (ccColor3BWapper*)pValue;
                    node.setColor(value.getColor());
                } else {
                    cc.log("unsupported property name is "+ propName);
                    cc.Assert(false, "unsupported property now");
                }
            }
        }
    },

    _setFirstFrame:function (node, seqProp, tweenDuration) {
        var keyframes = seqProp.getKeyframes();

        if (keyframes.length == 0) {
            // Use base value (no animation)
            var baseValue = this._getBaseValue(node, seqProp.getName());
            cc.Assert(baseValue, "No baseValue found for property");
            this._setAnimatedProperty(seqProp.getName(), node, baseValue, tweenDuration);
        } else {
            // Use first keyframe
            var keyframe = keyframes[0];
            this._setAnimatedProperty(seqProp.getName(), node, keyframe.getValue(), tweenDuration);
        }
    },

    _getEaseAction:function (action, easingType, easingOpt) {
        if (easingType === CCB_KEYFRAME_EASING_LINEAR || easingType === CCB_KEYFRAME_EASING_INSTANT ) {
            return action;
        } else if (easingType === CCB_KEYFRAME_EASING_CUBIC_IN) {
            return cc.EaseIn.create(action, easingOpt);
        } else if (easingType === CCB_KEYFRAME_EASING_CUBIC_OUT) {
            return cc.EaseOut.create(action, easingOpt);
        } else if (easingType === CCB_KEYFRAME_EASING_CUBIC_INOUT) {
            return cc.EaseInOut.create(action, easingOpt);
        } else if (easingType === CCB_KEYFRAME_EASING_BACK_IN) {
            return cc.EaseBackIn.create(action);
        } else if (easingType === CCB_KEYFRAME_EASING_BACK_OUT) {
            return cc.EaseBackOut.create(action);
        } else if (easingType === CCB_KEYFRAME_EASING_BACK_INOUT) {
            return cc.EaseBackInOut.create(action);
        } else if (easingType === CCB_KEYFRAME_EASING_BOUNCE_IN) {
            return cc.EaseBounceIn.create(action);
        } else if (easingType === CCB_KEYFRAME_EASING_BOUNCE_OUT) {
            return cc.EaseBounceOut.create(action);
        } else if (easingType === CCB_KEYFRAME_EASING_BOUNCE_INOUT) {
            return cc.EaseBounceInOut.create(action);
        } else if (easingType === CCB_KEYFRAME_EASING_ELASTIC_IN) {
            return cc.EaseElasticIn.create(action, easingOpt);
        } else if (easingType === CCB_KEYFRAME_EASING_ELASTIC_OUT) {
            return cc.EaseElasticOut.create(action, easingOpt);
        } else if (easingType === CCB_KEYFRAME_EASING_ELASTIC_INOUT) {
            return cc.EaseElasticInOut.create(action, easingOpt);
        } else {
            cc.log("BuilderReader: Unkown easing type " + easingType);
            return action;
        }
    },

    _runAction:function (node, seqProp, tweenDuration) {
        var keyframes = seqProp.getKeyframes();
        var numKeyframes = keyframes.length;

        if (numKeyframes > 1) {
            // Make an animation!
            var actions = [];

            var keyframeFirst = keyframes[0];
            var timeFirst = keyframeFirst.getTime() + tweenDuration;

            if (timeFirst > 0) {
                actions.push(cc.DelayTime.create(timeFirst));
            }

            for (var i = 0; i < numKeyframes - 1; ++i) {
                var kf0 = keyframes[i];
                var kf1 = keyframes[(i+1)];

                var action = this._getAction(kf0, kf1, seqProp.getName(), node);
                if (action) {
                    // Apply easing
                    action = this._getEaseAction(action, kf0.getEasingType(), kf0.getEasingOpt());
                    actions.push(action);
                }
            }

            var seq = cc.Sequence.create(actions);
            node.runAction(seq);
        }
    },

    _sequenceCompleted:function () {
        if(this._lastCompletedSequenceName != this._runningSequence.getName()){
            this._lastCompletedSequenceName = this._runningSequence.getName();
        }

        if (this._delegate)
            this._delegate.completedAnimationSequenceNamed(this._runningSequence.getName());

        if(this._target && this._animationCompleteCallbackFunc){
            this._animationCompleteCallbackFunc.call(this._target);
        }

        var nextSeqId = this._runningSequence.getChainedSequenceId();
        this._runningSequence = null;

        if (nextSeqId != -1)
            this.runAnimations(nextSeqId, 0);
    }
});

cc._Dictionary = cc.Class.extend({
    _keyMapTb:null,
    _valueMapTb:null,
    __currId:0,

    ctor:function () {
        this._keyMapTb = {};
        this._valueMapTb = {};
        this.__currId = 2 << (0 | (Math.random() * 10));
    },

    __getKey:function () {
        this.__currId++;
        return "key_" + this.__currId;
    },

    setObject:function (value, key) {
        if (key == null) {
            return;
        }

        var keyId = this.__getKey();
        this._keyMapTb[keyId] = key;
        this._valueMapTb[keyId] = value;
    },

    objectForKey:function (key) {
        if (key == null)
            return null;

        for (var keyId in this._keyMapTb) {
            if (this._keyMapTb[keyId] === key) {
                return this._valueMapTb[keyId];
            }
        }
        return null;
    },

    valueForKey:function (key) {
        return this.objectForKey(key);
    },

    removeObjectForKey:function (key) {
        if (key == null)
            return;

        for (var keyId in this._keyMapTb) {
            if (this._keyMapTb[keyId] === key) {
                delete this._valueMapTb[keyId];
                delete this._keyMapTb[keyId];
                return;
            }
        }
    },

    removeObjectsForKeys:function (keys) {
        if (keys == null)
            return;

        for (var i = 0; i < keys.length; i++) {
            this.removeObjectForKey(keys[i]);
        }
    },

    allKeys:function () {
        var keyArr = [];
        for (var key in this._keyMapTb) {
            keyArr.push(this._keyMapTb[key]);
        }
        return keyArr;
    },

    removeAllObjects:function () {
        this._keyMapTb = {};
        this._valueMapTb = {};
    },

    count:function(){
        return this.allKeys().length;
    }
});

cc.BuilderSetSpriteFrame = cc.ActionInstant.extend({
    _spriteFrame:null,

    initWithSpriteFrame:function (spriteFrame) {
        this._spriteFrame = spriteFrame;
        return true;
    },
    update:function (time) {
        this._target.setDisplayFrame(this._spriteFrame);
    }
});

cc.BuilderSetSpriteFrame.create = function (spriteFrame) {
    var ret = new cc.BuilderSetSpriteFrame();
    if (ret) {
        if (ret.initWithSpriteFrame(spriteFrame))
            return ret;
    }
    return null;
};

cc.BuilderRotateTo = cc.ActionInterval.extend({
    _startAngle:0,
    _dstAngle:0,
    _diffAngle:0,

    initWithDuration:function (duration, angle) {
        if (this._super(duration)) {
            this._dstAngle = angle;
            return true;
        } else {
            return false;
        }
    },
    update:function (time) {
        this._target.setRotation(this._startAngle + (this._diffAngle * time));
    },

    startWithTarget:function (node) {
        this._super(node);
        this._startAngle = this._target.getRotation();
        this._diffAngle = this._dstAngle - this._startAngle;
    }
});

cc.BuilderRotateTo.create = function (duration, angle) {
    var ret = new cc.BuilderRotateTo();
    if (ret) {
        if (ret.initWithDuration(duration, angle))
            return ret;
    }
    return null;
};