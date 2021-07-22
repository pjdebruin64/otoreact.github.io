const defaultSettings = {
    bAbortOnError: false,
    bShowErrors: true,
    bStripSpaces: true,
    bRunScripts: false,
    bBuild: true,
};
export function RCompile(elm, settings) {
    try {
        const R = RHTML;
        R.Compile(elm, { ...defaultSettings, ...settings });
        R.ToBuild.push({ parent: elm, start: elm.firstChild, bInit: true, env: [], });
        if (R.Settings.bBuild)
            RUpdate();
        return R;
    }
    catch (err) {
        window.alert(`Re-Act error: ${err}`);
    }
}
;
;
;
class Construct {
    constructor(TagName, Parameters = [], Slots = new Map()) {
        this.TagName = TagName;
        this.Parameters = Parameters;
        this.Slots = Slots;
    }
}
const globalEval = eval;
var ModifierType;
(function (ModifierType) {
    ModifierType[ModifierType["Attr"] = 0] = "Attr";
    ModifierType[ModifierType["Prop"] = 1] = "Prop";
    ModifierType[ModifierType["Class"] = 2] = "Class";
    ModifierType[ModifierType["Style"] = 3] = "Style";
    ModifierType[ModifierType["Event"] = 4] = "Event";
    ModifierType[ModifierType["Apply"] = 5] = "Apply";
    ModifierType[ModifierType["AddToStyle"] = 6] = "AddToStyle";
    ModifierType[ModifierType["AddToClassList"] = 7] = "AddToClassList";
})(ModifierType || (ModifierType = {}));
let num = 0;
class RCompiler {
    constructor(clone) {
        this.instanceNum = num++;
        this.HiddenConstructs = [];
        this.restoreActions = [];
        this.ToBuild = [];
        this.AllRegions = [];
        this.bTrimLeft = false;
        this.bTrimRight = false;
        this.bCompiled = false;
        this.bHasReacts = false;
        this.DirtyRegions = new Set();
        this.bUpdating = false;
        this.handleUpdate = null;
        this.RUpdate = function RUpdate() {
            clearTimeout(this.handleUpdate);
            this.handleUpdate = orgSetTimeout(() => {
                this.handleUpdate = null;
                this.DoUpdate();
            }, 0);
        }.bind(this);
        this.RVAR = function (name, initialValue, storage) {
            let V = new _RVAR(this, name, initialValue, storage);
            if (!this.bUpdating)
                this.rvarList.push(V);
            return V;
        }.bind(this);
        this.rvarList = [];
        this.setTimeout = function (handler, timeout, ...args) {
            return orgSetTimeout(UpdateTimerHandler(this, handler), timeout, ...args);
        }.bind(this);
        this.setInterval = function (handler, timeout, ...args) {
            return orgSetInterval(UpdateTimerHandler(this, handler), timeout, ...args);
        }.bind(this);
        this.sourceNodeCount = 0;
        this.builtNodeCount = 0;
        this.Context = clone ? clone.Context.slice() : [];
        this.ContextMap = clone ? new Map(clone.ContextMap) : new Map();
        this.Constructs = clone ? new Map(clone.Constructs) : new Map();
    }
    Save() {
        return this.restoreActions.length;
    }
    Restore(savedContext) {
        for (let j = this.restoreActions.length; j > savedContext; j--)
            this.restoreActions.pop()();
    }
    NewVar(name) {
        if (!name)
            return (_) => (_) => { };
        if (!/^[A-Z_$][A-Z0-9_$]*$/i.test(name))
            throw `Invalid identifier '${name}'`;
        let i = this.ContextMap.get(name);
        const bNewName = i == null;
        if (bNewName) {
            i = this.Context.push(name) - 1;
            this.ContextMap.set(name, i);
            this.restoreActions.push(() => this.ContextMap.delete(this.Context.pop()));
        }
        return function InitVar(env) {
            if (bNewName) {
                env.push(null);
                this.restoreActions.push(() => env.pop());
            }
            else {
                const prev = env[i];
                this.restoreActions.push(() => { env[i] = prev; });
            }
            return function SetVar(value) {
                env[i] = value;
            };
        }.bind(this);
    }
    AddConstruct(C) {
        const CName = C.TagName, prevC = this.Constructs.get(C.TagName);
        this.Constructs.set(CName, C);
        this.restoreActions.push(() => this.Constructs.set(CName, prevC));
    }
    Compile(elm, settings) {
        this.Settings = { ...defaultSettings, ...settings, };
        const t0 = Date.now();
        const savedRCompiler = RHTML;
        this.Builder = this.CompileChildNodes(elm);
        RHTML = savedRCompiler;
        const t1 = Date.now();
        console.log(`Compiled ${this.sourceNodeCount} nodes in ${t1 - t0} ms`);
        this.bCompiled = true;
    }
    Build(reg) {
        let savedRCompiler = RHTML;
        RHTML = this;
        this.Builder(reg);
        this.AllRegions.push({
            parent: reg.parent, marker: reg.marker, builder: this.Builder, env: []
        });
        RHTML = savedRCompiler;
    }
    DoUpdate() {
        if (!this.bCompiled || this.bUpdating)
            return;
        this.bUpdating = true;
        if (this.ToBuild.length) {
            const t0 = Date.now();
            this.builtNodeCount = 0;
            for (const reg of this.ToBuild)
                this.Build(reg);
            console.log(`Built ${this.builtNodeCount} nodes in ${Date.now() - t0} ms`);
            this.ToBuild = [];
        }
        if (!this.bHasReacts && this.bSomethingDirty)
            for (const s of this.AllRegions)
                this.DirtyRegions.add(s);
        if (this.DirtyRegions.size) {
            let savedRCompiler = RHTML;
            RHTML = this;
            const t0 = Date.now();
            this.builtNodeCount = 0;
            this.bSomethingDirty = false;
            for (const { parent, marker, builder, env } of this.DirtyRegions) {
                try {
                    builder.call(this, { parent, start: marker ? marker.nextSibling : parent.firstChild, env, });
                }
                catch (err) {
                    const msg = `ERROR: ${err}`;
                    console.log(msg);
                }
            }
            console.log(`Updated ${this.builtNodeCount} nodes in ${Date.now() - t0} ms`);
            this.DirtyRegions.clear();
            RHTML = savedRCompiler;
        }
        this.bUpdating = false;
    }
    RVAR_Light(t, updatesTo = []) {
        if (!t._Subscribers) {
            t._Subscribers = [];
            t._UpdatesTo = updatesTo;
            const R = this;
            Object.defineProperty(t, 'U', { get: function () {
                    for (const rvar of t._UpdatesTo)
                        rvar.SetDirty();
                    for (const sub of t._Subscribers)
                        R.DirtyRegions.add(sub);
                    return t;
                }
            });
            t.Subscribe = function (sub) { t._Subscribers.push(sub); };
        }
        return t;
    }
    CompileChildNodes(srcParent, bBlockLevel, childNodes = Array.from(srcParent.childNodes)) {
        const builders = [];
        const saved = this.Save();
        this.sourceNodeCount += childNodes.length;
        for (const srcNode of childNodes) {
            switch (srcNode.nodeType) {
                case Node.ELEMENT_NODE:
                    builders.push(...this.CompileElement(srcParent, srcNode, bBlockLevel));
                    if (builders[builders.length - 1][0].bTrim) {
                        let i = builders.length - 2;
                        while (i >= 0 && builders[i][2]) {
                            srcParent.removeChild(builders[i][1]);
                            builders.splice(i, 1);
                            i--;
                        }
                    }
                    break;
                case Node.TEXT_NODE:
                    const str = srcNode.data
                        .replace(/^\s+/g, this.bTrimLeft ? '' : ' ')
                        .replace(/\s+$/, ' ');
                    if (str != '') {
                        this.bTrimLeft = / $/.test(str);
                        const getText = this.CompileInterpolatedString(str);
                        function Text(region) {
                            const { start, lastMarker, bInit } = region, content = getText(region.env);
                            let text;
                            if (bInit && start != srcNode)
                                text = region.parent.insertBefore(document.createTextNode(content), start);
                            else {
                                start.data = content;
                                region.start = start.nextSibling;
                            }
                            if (lastMarker) {
                                lastMarker.nextM = text;
                                region.lastMarker = null;
                            }
                        }
                        builders.push([Text, srcNode, getText.isBlank]);
                    }
                    else
                        srcParent.removeChild(srcNode);
                    break;
                default:
                    srcParent.removeChild(srcNode);
                    continue;
            }
        }
        ;
        this.Restore(saved);
        return function ChildNodes(region) {
            const saved = this.Save();
            try {
                for (const [builder, node] of builders)
                    this.CallWithErrorHandling(builder, node, region);
                this.builtNodeCount += builders.length;
            }
            finally {
                this.Restore(saved);
            }
        };
    }
    CompileElement(srcParent, srcElm, bBlockLevel) {
        let builder = null;
        const reactOn = srcElm.getAttribute('reacton');
        if (reactOn != null)
            srcElm.attributes.removeNamedItem('reacton');
        try {
            const construct = this.Constructs.get(srcElm.tagName);
            if (construct)
                builder = this.CompileConstructInstance(srcParent, srcElm, construct);
            else
                switch (srcElm.nodeName) {
                    case 'DEF':
                    case 'DEFINE':
                        {
                            srcParent.removeChild(srcElm);
                            const rvarName = GetAttribute(srcElm, 'rvar');
                            const varName = rvarName || GetAttribute(srcElm, 'name') || GetAttribute(srcElm, 'var', true);
                            const getValue = this.CompileAttributeExpression(srcElm, 'value');
                            const newVar = this.NewVar(varName);
                            const bReact = GetAttribute(srcElm, 'react') != null;
                            builder = function DEFINE(region) {
                                const { marker } = PrepareRegion(srcElm, region);
                                if (region.bInit || bReact) {
                                    const value = getValue && getValue(region.env);
                                    marker.rValue = rvarName ? this.RVAR(null, value) : value;
                                }
                                newVar(region.env)(marker.rValue);
                            };
                        }
                        break;
                    case 'IF':
                    case 'CASE':
                        {
                            const caseList = [];
                            const getCondition = (srcElm.nodeName == 'IF') && this.CompileAttributeExpression(srcElm, 'cond', true);
                            const bodyNodes = [];
                            const bTrimLeft = this.bTrimLeft;
                            for (const child of srcElm.children) {
                                switch (child.nodeName) {
                                    case 'WHEN':
                                        caseList.push({
                                            condition: this.CompileAttributeExpression(child, 'cond', true),
                                            builder: this.CompileChildNodes(child, bBlockLevel),
                                            child
                                        });
                                        break;
                                    case 'ELSE':
                                        caseList.push({
                                            condition: (_env) => true,
                                            builder: this.CompileChildNodes(child, bBlockLevel),
                                            child
                                        });
                                        break;
                                    default: bodyNodes.push(child);
                                }
                                this.bTrimLeft = bTrimLeft;
                            }
                            if (getCondition)
                                caseList.unshift({
                                    condition: getCondition,
                                    builder: this.CompileChildNodes(srcElm, bBlockLevel, bodyNodes),
                                    child: srcElm
                                });
                            builder = function CASE(region) {
                                let result = null;
                                for (const alt of caseList)
                                    try {
                                        if (alt.condition(region.env)) {
                                            result = alt.builder;
                                            break;
                                        }
                                    }
                                    catch (err) {
                                        throw `${OuterOpenTag(alt.child)}${err}`;
                                    }
                                const subregion = PrepareRegion(srcElm, region, result);
                                if (result)
                                    result.call(this, subregion);
                            };
                            this.bTrimLeft = false;
                        }
                        break;
                    case 'FOR':
                    case 'FOREACH':
                        builder = this.CompileForeach(srcParent, srcElm, bBlockLevel);
                        break;
                    case 'INCLUDE':
                        {
                            const src = GetAttribute(srcElm, 'src', true);
                            let C = new RCompiler(this);
                            let arrToBuild = [];
                            fetch(src)
                                .then(async (response) => {
                                const textContent = await response.text();
                                const parser = new DOMParser();
                                const parsedContent = parser.parseFromString(textContent, 'text/html');
                                C.Compile(parsedContent.body, this.Settings);
                                for (const region of arrToBuild)
                                    if (region.parent.isConnected)
                                        C.Builder(region);
                                arrToBuild = null;
                            });
                            builder =
                                function INCLUDE(region) {
                                    const subregion = PrepareRegion(srcElm, region);
                                    if (C.bCompiled)
                                        C.Builder(subregion);
                                    else {
                                        subregion.env = region.env.slice();
                                        arrToBuild.push(subregion);
                                    }
                                };
                        }
                        break;
                    case 'IMPORT':
                        {
                            const src = GetAttribute(srcElm, 'src', true);
                            const mapComponents = new Map();
                            for (const child of srcElm.children)
                                mapComponents.set(child.tagName, this.ParseSignature(child));
                            fetch(src)
                                .then(async (response) => {
                                const textContent = await response.text();
                                const parser = new DOMParser();
                                const parsedContent = parser.parseFromString(textContent, 'text/html');
                                for (const libElm of parsedContent.children)
                                    if (libElm.tagName == 'COMPONENT') {
                                        const compName = libElm.firstElementChild.tagName;
                                        const component = mapComponents.get(compName);
                                    }
                            });
                            builder = function IMPORT(region) {
                            };
                        }
                        ;
                        break;
                    case 'REACT':
                        {
                            this.bHasReacts = true;
                            const expList = GetAttribute(srcElm, 'on', true, true).split(',');
                            const getDependencies = expList.map(expr => this.CompileExpression(expr));
                            const bodyBuilder = this.CompileChildNodes(srcElm, bBlockLevel);
                            builder = function REACT(region) {
                                let subregion = PrepareRegion(srcElm, region);
                                if (subregion.bInit) {
                                    if (subregion.start == srcElm) {
                                        subregion.start = srcElm.firstChild;
                                        srcElm.replaceWith(...srcElm.childNodes);
                                    }
                                    const subscriber = {
                                        ...subregion,
                                        builder: bodyBuilder,
                                        env: subregion.env.slice(),
                                    };
                                    for (const getRvar of getDependencies) {
                                        const rvar = getRvar(subregion.env);
                                        rvar.Subscribe(subscriber);
                                    }
                                }
                                bodyBuilder.call(this, subregion);
                            };
                        }
                        break;
                    case 'RHTML':
                        {
                            const bodyBuilder = this.CompileChildNodes(srcElm, bBlockLevel);
                            srcParent.removeChild(srcElm);
                            builder = function RHTML(region) {
                                const tempElm = document.createElement('RHTML');
                                bodyBuilder.call(this, { parent: tempElm, start: null, env: region.env, bInit: true });
                                const result = tempElm.innerText;
                                const subregion = PrepareRegion(srcElm, region, result);
                                if (subregion.bInit) {
                                    tempElm.innerHTML = tempElm.innerText;
                                    const R = new RCompiler();
                                    subregion.env = [];
                                    R.Compile(tempElm, { bRunScripts: true });
                                    R.Build(subregion);
                                }
                            };
                        }
                        break;
                    case 'SCRIPT':
                        builder = this.CompileScript(srcParent, srcElm);
                        break;
                    case 'COMPONENT':
                        return this.CompileComponent(srcParent, srcElm);
                    default:
                        builder = this.CompileRegularElement(srcElm);
                        break;
                }
        }
        catch (err) {
            throw `${OuterOpenTag(srcElm)} ${err}`;
        }
        if (reactOn) {
            this.bHasReacts = true;
            const getDependencies = reactOn.split(',').map(expr => this.CompileExpression(expr));
            const bodyBuilder = builder;
            builder = function REACT(region) {
                let { parent, marker } = PrepareRegion(srcElm, region, null, null, 'reacton');
                bodyBuilder.call(this, region);
                if (region.bInit) {
                    const subscriber = {
                        parent, marker,
                        builder: function reacton(reg) {
                            this.CallWithErrorHandling(bodyBuilder, srcElm, reg);
                        },
                        env: region.env.slice(),
                    };
                    for (const getRvar of getDependencies) {
                        const rvar = getRvar(region.env);
                        rvar.Subscribe(subscriber);
                    }
                }
            };
        }
        if (builder)
            return [[builder, srcElm]];
        return [];
    }
    CallWithErrorHandling(builder, srcNode, region) {
        const start = region.start;
        if (start?.errorNode) {
            region.parent.removeChild(start.errorNode);
            start.errorNode = undefined;
        }
        try {
            builder.call(this, region);
        }
        catch (err) {
            const message = srcNode instanceof HTMLElement ? `${OuterOpenTag(srcNode, 40)} ${err}` : err;
            if (this.Settings.bAbortOnError)
                throw message;
            console.log(message);
            if (this.Settings.bShowErrors)
                start.errorNode =
                    region.parent.insertBefore(document.createTextNode(message), region.start);
        }
    }
    CompileScript(srcParent, srcElm) {
        srcParent.removeChild(srcElm);
        if (!(this.Settings.bRunScripts || srcElm.hasAttribute('nomodule')))
            return null;
        const script = srcElm.textContent;
        let bDone = false;
        return function SCRIPT(_) {
            if (!bDone) {
                globalEval(`'use strict';${script}`);
                bDone = true;
            }
        };
    }
    CompileForeach(srcParent, srcElm, bBlockLevel) {
        const varName = GetAttribute(srcElm, 'let');
        const indexName = srcElm.getAttribute('index');
        const saved = this.Save();
        try {
            if (varName != null) {
                const getRange = this.CompileAttributeExpression(srcElm, 'of');
                const prevName = srcElm.getAttribute('previous');
                const bUpdateable = CBool(srcElm.getAttribute('updateable'), true);
                const getUpdatesTo = this.CompileAttributeExpression(srcElm, 'updates');
                const initVar = this.NewVar(varName);
                const initIndex = this.NewVar(indexName);
                const initPrevious = this.NewVar(prevName);
                const getKey = this.CompileAttributeExpression(srcElm, 'key');
                const getHash = this.CompileAttributeExpression(srcElm, 'hash');
                if (srcElm.childNodes.length == 0)
                    throw "FOREACH has an empty body.\nIf you placed <FOREACH> within a <table>, then the parser has rearranged these elements.\nUse <table.>, <tr.> etc instead.";
                const bodyBuilder = this.CompileChildNodes(srcElm);
                srcParent.removeChild(srcElm);
                return function FOREACH(region) {
                    let subregion = PrepareRegion(srcElm, region, null, (getKey == null));
                    let { parent, marker, start, env } = subregion;
                    const saved = this.Save();
                    try {
                        const keyMap = (region.bInit ? marker.keyMap = new Map() : marker.keyMap);
                        const newMap = new Map();
                        const setVar = initVar(env);
                        for (const item of getRange(env)) {
                            setVar(item);
                            const hash = getHash && getHash(env);
                            const key = getKey ? getKey(env) : hash;
                            newMap.set(key ?? {}, [item, hash]);
                        }
                        function RemoveStaleItemsHere() {
                            let key;
                            while (start && start != region.start && !newMap.has(key = start.key)) {
                                if (key != null)
                                    keyMap.delete(key);
                                const nextMarker = start.nextM;
                                while (start != nextMarker) {
                                    const next = start.nextSibling;
                                    parent.removeChild(start);
                                    start = next;
                                }
                            }
                        }
                        RemoveStaleItemsHere();
                        const setIndex = initIndex(env);
                        const setPrevious = initPrevious(env);
                        let index = 0, prevItem = null;
                        for (const [key, [item, hash]] of newMap) {
                            let rvar = (getUpdatesTo ? this.RVAR_Light(item, [getUpdatesTo(env)])
                                : bUpdateable ? this.RVAR_Light(item)
                                    : item);
                            setVar(rvar);
                            setIndex(index);
                            setPrevious(prevItem);
                            let marker;
                            let subscriber = keyMap.get(key);
                            let childRegion;
                            if (subscriber && subscriber.marker.isConnected) {
                                marker = subscriber.marker;
                                const nextMarker = marker.nextM;
                                if (marker != start) {
                                    let node = marker;
                                    while (node != nextMarker) {
                                        const next = node.nextSibling;
                                        parent.insertBefore(node, start);
                                        node = next;
                                    }
                                }
                                marker.textContent = `${varName}(${index})`;
                                subregion.bInit = false;
                                subregion.start = marker;
                                const lastMarker = subregion.lastMarker;
                                childRegion = PrepareRegion(null, subregion, null, false);
                                if (lastMarker)
                                    lastMarker.nextM = marker;
                                subregion.lastMarker = marker;
                            }
                            else {
                                subregion.bInit = true;
                                subregion.start = start;
                                childRegion = PrepareRegion(null, subregion, null, true, `${varName}(${index})`);
                                subscriber = {
                                    ...childRegion,
                                    builder: (bUpdateable ? bodyBuilder : undefined),
                                    env: (bUpdateable ? env.slice() : undefined),
                                };
                                if (key != null) {
                                    if (keyMap.has(key))
                                        throw `Duplicate key '${key}'`;
                                    keyMap.set(key, subscriber);
                                }
                                marker = childRegion.marker;
                                marker.key = key;
                            }
                            if (hash != null
                                && (hash == marker.hash
                                    || (marker.hash = hash, false))) {
                            }
                            else
                                bodyBuilder.call(this, childRegion);
                            if (bUpdateable)
                                rvar.Subscribe(subscriber);
                            prevItem = item;
                            index++;
                            start = subregion.start;
                            RemoveStaleItemsHere();
                        }
                    }
                    finally {
                        this.Restore(saved);
                    }
                };
            }
            else {
                const ofExpression = GetAttribute(srcElm, 'of', true, true);
                const slot = this.Constructs.get(ofExpression);
                if (!slot)
                    throw `Missing attribute [let]`;
                const initIndex = this.NewVar(indexName);
                const bodyBuilder = this.CompileChildNodes(srcElm, bBlockLevel);
                srcParent.removeChild(srcElm);
                return function FOREACH_Slot(region) {
                    let subregion = PrepareRegion(srcElm, region);
                    const saved = this.saveContext();
                    const slotBuilders = slot.Builders;
                    try {
                        const setIndex = initIndex(region.environment);
                        let index = 0;
                        for (const slotBuilder of slotBuilders) {
                            setIndex(index++);
                            slot.Builders = [slotBuilder];
                            bodyBuilder.call(this, subregion);
                        }
                    }
                    finally {
                        slot.Builders = slotBuilders;
                        this.Restore(saved);
                    }
                };
            }
        }
        finally {
            this.Restore(saved);
        }
    }
    ParseSignature(elmSignature) {
        const comp = new Construct(elmSignature.tagName);
        for (const attr of elmSignature.attributes) {
            const m = /^(#)?(.*?)(\?)?$/.exec(attr.name);
            comp.Parameters.push({ name: m[2],
                pdefault: attr.value != ''
                    ? (m[1] ? this.CompileExpression(attr.value) : this.CompileInterpolatedString(attr.value))
                    : m[3] ? (_) => undefined
                        : null
            });
        }
        for (const elmSlot of elmSignature.children)
            comp.Slots.set(elmSlot.tagName, this.ParseSignature(elmSlot));
        return comp;
    }
    CompileComponent(srcParent, srcElm) {
        srcParent.removeChild(srcElm);
        const builders = [];
        let elmSignature, elmTemplate;
        for (let srcChild of Array.from(srcElm.children))
            switch (srcChild.nodeName) {
                case 'SCRIPT':
                    const builder = this.CompileScript(srcElm, srcChild);
                    if (builder)
                        builders.push([builder, srcChild]);
                    break;
                case 'STYLE':
                    break;
                case 'TEMPLATE':
                    if (elmTemplate)
                        throw 'Double <TEMPLATE>';
                    elmTemplate = srcChild;
                    break;
                default:
                    if (elmSignature)
                        throw 'Double signature';
                    elmSignature = srcChild;
                    break;
            }
        if (!elmSignature)
            throw `Missing signature`;
        if (!elmTemplate)
            throw 'Missing <TEMPLATE>';
        const component = this.ParseSignature(elmSignature);
        this.AddConstruct(component);
        component.Builders = [
            this.CompileConstructTemplate(component, elmTemplate.content, elmTemplate)
        ];
        builders.push([function (reg) {
                const prevEnv = component.ConstructEnv;
                component.ConstructEnv = reg.env.slice();
            }, srcElm]);
        return builders;
    }
    CompileConstructTemplate(construct, contentNode, srcElm, bInstance) {
        const saved = this.Save();
        for (let param of construct.Parameters)
            param.initVar = this.NewVar(bInstance && GetAttribute(srcElm, param.name, true) || param.name);
        for (const S of construct.Slots.values())
            this.AddConstruct(S);
        try {
            return this.CompileChildNodes(contentNode);
        }
        catch (err) {
            throw `${OuterOpenTag(srcElm)} ${err}`;
        }
        finally {
            this.Restore(saved);
        }
    }
    CompileConstructInstance(srcParent, srcElm, construct) {
        srcParent.removeChild(srcElm);
        const computeParameters = [];
        for (const { name, pdefault } of construct.Parameters)
            try {
                let attVal;
                computeParameters.push(((attVal = srcElm.getAttribute(`#${name}`)) != null
                    ? this.CompileExpression(attVal)
                    : (attVal = srcElm.getAttribute(name)) != null
                        ? this.CompileInterpolatedString(attVal)
                        : pdefault != null
                            ? (_env) => pdefault(construct.ConstructEnv)
                            : thrower(`Missing parameter [${name}]`)));
            }
            catch (err) {
                throw `[${name}]: ${err}`;
            }
        const slotBuilders = new Map();
        for (const name of construct.Slots.keys())
            slotBuilders.set(name, []);
        let slotElm, Slot;
        for (const node of Array.from(srcElm.childNodes))
            if (node.nodeType == Node.ELEMENT_NODE
                && (Slot = construct.Slots.get((slotElm = node).tagName))) {
                slotBuilders.get(slotElm.tagName).push(this.CompileConstructTemplate(Slot, slotElm, slotElm, true));
                srcElm.removeChild(node);
            }
        const contentSlot = construct.Slots.get('CONTENT');
        if (contentSlot)
            slotBuilders.get('CONTENT').push(this.CompileConstructTemplate(contentSlot, srcElm, srcElm, true));
        this.bTrimLeft = false;
        return (region) => {
            const subregion = PrepareRegion(srcElm, region);
            const env = subregion.env;
            const componentEnv = construct.ConstructEnv.slice();
            const saved = this.Save();
            let i = 0;
            for (const param of construct.Parameters) {
                param.initVar(componentEnv)(computeParameters[i](env));
                i++;
            }
            for (const [name, slot] of construct.Slots) {
                const prevBuilders = slot.Builders, prevEnv = slot.ConstructEnv;
                slot.Builders = slotBuilders.get(name);
                slot.ConstructEnv = env.slice();
                this.restoreActions.push(() => { slot.Builders = prevBuilders; slot.ConstructEnv = prevEnv; });
            }
            try {
                for (const builder of construct.Builders)
                    builder.call(this, { ...subregion, env: componentEnv, });
            }
            finally {
                this.Restore(saved);
            }
        };
    }
    CompileRegularElement(srcElm) {
        const nodeName = srcElm.nodeName.replace(/\.+$/, '');
        const bTrim = /^(BLOCKQUOTE|D[DLT]|DIV|FORM|H\D|HR|LI|OL|P|PRE|TABLE|T[RD]|UL)$/.test(nodeName);
        const arrModifiers = [];
        for (const attr of srcElm.attributes) {
            const attrName = attr.name;
            let m;
            try {
                if (m = /^on(.*)$/i.exec(attrName)) {
                    const oHandler = this.CompileExpression(`function ${attrName}(event){${CheckForComments(attr.value)}}`);
                    arrModifiers.push({
                        modType: ModifierType.Event, name: m[1],
                        depValue: oHandler
                    });
                }
                else if (m = /^#class:(.*)$/.exec(attrName))
                    arrModifiers.push({
                        modType: ModifierType.Class, name: m[1],
                        depValue: this.CompileExpression(attr.value)
                    });
                else if (m = /^#style\.(.*)$/.exec(attrName))
                    arrModifiers.push({
                        modType: ModifierType.Style, name: CapitalizeProp(m[1]),
                        depValue: this.CompileExpression(attr.value)
                    });
                else if (attrName == '+style')
                    arrModifiers.push({
                        modType: ModifierType.AddToStyle, name: null,
                        depValue: this.CompileExpression(attr.value)
                    });
                else if (m = /^#(.*)/.exec(attrName))
                    arrModifiers.push({
                        modType: ModifierType.Prop, name: CapitalizeProp(m[1]),
                        depValue: this.CompileExpression(attr.value)
                    });
                else if (attrName == "+class")
                    arrModifiers.push({
                        modType: ModifierType.AddToClassList, name: null,
                        depValue: this.CompileExpression(attr.value)
                    });
                else if (attrName == "apply")
                    arrModifiers.push({
                        modType: ModifierType.Apply, name: null,
                        depValue: this.CompileExpression(`function apply(){${CheckForComments(attr.value)}}`)
                    });
                else if (m = /^([*@])(\1)?(.*)$/.exec(attrName)) {
                    const propName = CapitalizeProp(m[3]);
                    const setter = this.CompileExpression(`function (){let ORx=this.${propName};if(${attr.value}!==ORx)${attr.value}=ORx}`);
                    arrModifiers.push(m[1] == '*'
                        ? { modType: ModifierType.Apply, name: null, depValue: setter, }
                        : { modType: ModifierType.Prop, name: propName, depValue: this.CompileExpression(attr.value) });
                    arrModifiers.push({
                        modType: ModifierType.Event, name: m[2] ? 'change' : 'input', tag: propName, depValue: setter,
                    });
                }
                else
                    arrModifiers.push({
                        modType: ModifierType.Attr, name: attrName,
                        depValue: this.CompileInterpolatedString(attr.value)
                    });
            }
            catch (err) {
                throw (`[${attrName}]: ${err}`);
            }
        }
        if (bTrim)
            this.bTrimLeft = true;
        const childnodesBuilder = this.CompileChildNodes(srcElm, bTrim);
        if (bTrim)
            this.bTrimLeft = true;
        const builder = function Element(region) {
            const { parent, start, bInit, env, lastMarker } = region;
            let elm;
            if (!bInit || start == srcElm) {
                region.start = start.nextSibling;
                if (start.tagName == nodeName) {
                    elm = start;
                    elm.classList.remove(...elm.classList);
                }
                else {
                    (elm = document.createElement(nodeName)).append(...start.childNodes);
                    parent.replaceChild(elm, start);
                }
            }
            else {
                elm = document.createElement(nodeName);
                parent.insertBefore(elm, start);
            }
            if (lastMarker) {
                lastMarker.nextM = elm;
                region.lastMarker = null;
            }
            childnodesBuilder.call(this, { parent: elm, start: elm.firstChild, bInit, env, });
            for (const mod of arrModifiers) {
                const attName = mod.name;
                try {
                    const val = mod.depValue(env);
                    switch (mod.modType) {
                        case ModifierType.Attr:
                            elm.setAttribute(attName, val ?? '');
                            break;
                        case ModifierType.Prop:
                            if (val != null)
                                elm[attName] = val;
                            else
                                delete elm[attName];
                            break;
                        case ModifierType.Event:
                            {
                                const tag = `$$${mod.tag ?? attName}`;
                                let prevHandler;
                                if (prevHandler = elm[tag])
                                    elm.removeEventListener(attName, prevHandler);
                                elm.addEventListener(attName, elm[tag] = UpdateHandler(this, val.bind(elm)));
                            }
                            break;
                        case ModifierType.Class:
                            if (val)
                                elm.classList.add(attName);
                            break;
                        case ModifierType.Style:
                            if (val)
                                elm.style[attName] = val;
                            else
                                delete elm.style[attName];
                            break;
                        case ModifierType.Apply:
                            val.call(elm);
                            break;
                        case ModifierType.AddToStyle:
                            Object.assign(elm.style, val);
                            break;
                        case ModifierType.AddToClassList:
                            if (Array.isArray(val))
                                for (const className of val)
                                    elm.classList.add(className);
                            else
                                for (const [className, bln] of Object.entries(val))
                                    if (bln)
                                        elm.classList.add(className);
                    }
                }
                catch (err) {
                    throw `[${attName}]: ${err}`;
                }
            }
            if (nodeName == 'SCRIPT')
                elm.text = elm.textContent;
        };
        builder.bTrim = bTrim;
        return builder;
    }
    CompileInterpolatedString(data, name) {
        const generators = [];
        const reg = /(?<!\\)\{(.*?)(?<!\\)\}|$/gs;
        let isBlank = true;
        while (reg.lastIndex < data.length) {
            const lastIndex = reg.lastIndex;
            const m = reg.exec(data);
            const fixed = lastIndex < m.index ? data.substring(lastIndex, m.index) : null;
            if (fixed)
                generators.push(fixed.replace(/\\([{}\\])/g, '$1'));
            if (m[1])
                generators.push(this.CompileExpression(m[1], '{}', null, true));
            if (m[1] || /\S/.test(fixed))
                isBlank = false;
        }
        const dep = (env) => {
            try {
                let result = "";
                for (const gen of generators)
                    result +=
                        (typeof gen == 'string' ? gen : gen(env) ?? '');
                return result;
            }
            catch (err) {
                throw `[${name}]: ${err}`;
            }
        };
        dep.isBlank = isBlank;
        return dep;
    }
    CompileAttributeExpression(elm, attName, bRequired) {
        return this.CompileExpression(GetAttribute(elm, attName, bRequired, true));
    }
    CompileExpression(expr, delims = "\"\"", bScript = false, bReturnErrors = false, name) {
        if (expr == null)
            return null;
        expr = CheckForComments(expr);
        let depExpr = bScript
            ? `([${this.Context.join(',')}]) => {'use strict';${expr}}`
            : `([${this.Context.join(',')}]) => (${expr})`;
        const errorInfo = `${name ? `[${name}] ` : ''}${delims[0]}${Abbreviate(expr, 60)}${delims[1]}: `;
        try {
            const routine = globalEval(depExpr);
            return (env) => {
                try {
                    return routine(env);
                }
                catch (err) {
                    const message = `${errorInfo}${err}`;
                    if (bReturnErrors && !this.Settings.bAbortOnError) {
                        console.log(message);
                        return (this.Settings.bShowErrors ? message : "");
                    }
                    else
                        throw message;
                }
            };
        }
        catch (err) {
            throw `${errorInfo}${err}`;
        }
    }
}
function PrepareRegion(srcElm, region, result = null, bForcedClear = false, name) {
    let { parent, start, bInit, lastMarker } = region;
    let marker;
    if (bInit) {
        marker = region.lastMarker = parent.insertBefore(document.createComment(name || srcElm.tagName), start);
        if (lastMarker)
            lastMarker.nextM = marker;
        if (start && start == srcElm)
            region.start = start.nextSibling;
    }
    else {
        marker = start;
        region.start = marker.nextM;
    }
    start = marker.nextSibling;
    if (bInit || (bInit = bForcedClear || (result != marker.rResult ?? null))) {
        marker.rResult = result;
        while (start != region.start) {
            const next = start.nextSibling;
            parent.removeChild(start);
            start = next;
        }
    }
    return { parent, marker, start, bInit, env: region.env };
}
function UpdateHandler(R, handler) {
    return handler &&
        function ReactiveHandler(ev) {
            const result = handler(ev);
            if (result instanceof Promise) {
                result.then(R.RUpdate);
                ev.preventDefault();
                return;
            }
            R.RUpdate();
            if (result === false)
                ev.preventDefault();
            return result;
        };
}
class _RVAR {
    constructor(rRuntime, name, initialValue, storage) {
        this.rRuntime = rRuntime;
        this.name = name;
        this.storage = storage;
        this.Subscribers = new Set();
        if (name) {
            globalThis[name] = this;
        }
        let s;
        if ((s = storage?.getItem(`RVAR_${name}`)) != null)
            try {
                this._Value = JSON.parse(s);
                return;
            }
            catch { }
        this._Value = initialValue;
    }
    Subscribe(s) {
        this.Subscribers.add(s);
    }
    get V() { return this._Value; }
    set V(t) {
        if (t !== this._Value) {
            this._Value = t;
            this.SetDirty();
            this.storage?.setItem(`RVAR_${this.name}`, JSON.stringify(t));
        }
    }
    get U() { this.SetDirty(); return this._Value; }
    set U(t) { this.V = t; this.rRuntime.RUpdate(); }
    SetDirty() {
        for (const sub of this.Subscribers)
            if (sub.parent.isConnected)
                this.rRuntime.DirtyRegions.add(sub);
            else
                this.Subscribers.delete(sub);
        this.rRuntime.bSomethingDirty = true;
    }
}
function UpdateTimerHandler(R, handler) {
    return function (...args) {
        const result = handler(...args);
        if (result instanceof Promise)
            result.then(R.RUpdate);
        else
            R.RUpdate();
    };
}
function CapitalizeProp(lcName) {
    let m;
    lcName = lcName.replace('html', 'HTML');
    while (m = /^(.*(align|animation|aria|background|border|bottom|class|client|column|content|element|font|image|inner|left|right|rule|top|value))([a-z])(.*)$/.exec(lcName))
        lcName = `${m[1]}${m[3].toUpperCase()}${m[4]}`;
    return lcName;
}
function CheckForComments(script) {
    const hasComments = /\/\/[^\n]*$/.test(script);
    return hasComments ? script + '\n' : script;
}
function GetAttribute(elm, name, bRequired, bHashAllowed) {
    let value = elm.getAttribute(name);
    if (value == null && bHashAllowed) {
        name = `#${name}`;
        value = elm.getAttribute(name);
    }
    if (value == null && bRequired)
        throw `Missing attribute [${name}]`;
    return value;
}
function RequiredChildElement(elm, name) {
    const result = OptionalChildElement(elm, name);
    if (!result)
        throw `Missing child element <${name}>`;
    return result;
}
function OptionalChildElement(elm, name) {
    let child = elm.firstElementChild;
    let result = null;
    while (child) {
        if (name == '*' || child.tagName == name) {
            if (result)
                throw `Multiple child elements <${name}>`;
            result = child;
        }
        child = child.nextElementSibling;
    }
    return result;
}
function OuterOpenTag(elm, maxLength) {
    return Abbreviate(/<.*?(?=>)/.exec(elm.outerHTML)[0], maxLength - 1) + '>';
}
function Abbreviate(s, maxLength) {
    if (maxLength && s.length > maxLength)
        return s.substr(0, maxLength - 3) + "...";
    return s;
}
function CBool(s, valOnEmpty) {
    if (typeof s == 'string')
        switch (s.toLowerCase()) {
            case "yes":
            case "true":
                return true;
            case "no":
            case "false":
                return false;
            case "":
                return valOnEmpty;
            default:
                return null;
        }
    return s;
}
function thrower(err) { throw err; }
const orgSetTimeout = globalThis.setTimeout;
const orgSetInterval = globalThis.setInterval;
export let RHTML = new RCompiler();
export const RVAR = RHTML.RVAR, RUpdate = RHTML.RUpdate, setTimeout = RHTML.setTimeout, setInterval = RHTML.setInterval;
Object.defineProperties(globalThis, {
    RVAR: { get: () => RHTML.RVAR },
    RUpdate: { get: () => RHTML.RUpdate },
    setTimeOut: { get: () => RHTML.setTimeout },
    setInterval: { get: () => RHTML.setInterval },
});
globalThis.RCompile = RCompile;
export function* range(from, upto, step = 1) {
    if (upto === undefined) {
        upto = from;
        from = 0;
    }
    for (let i = from; i < upto; i += step)
        yield i;
}
globalThis.range = range;
