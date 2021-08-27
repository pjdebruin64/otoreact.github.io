// Global settings
const defaultSettings = {
    bAbortOnError:  false,  // Abort processing on runtime errors,
                            // When false, only the element producing the error will be skipped
    bShowErrors:    true,   // Show runtime errors as text in the DOM output
    bStripSpaces:   true,   // To do
    bRunScripts:    false,
    bBuild:         true,
    rootPattern:    null as string,
}
type FullSettings = typeof defaultSettings
type Settings = { [Property in keyof FullSettings]+?: FullSettings[Property] };
let RootPath: string = null;

export function RCompile(elm: HTMLElement, settings?: Settings): Promise<void> {    
    try {
        const {rootPattern} = settings = {...defaultSettings, ...settings};
        if (rootPattern) {
            const url = document.location.href;
            const m = url.match(`^.*(${rootPattern})`);
            if (!m)
                throw `Root pattern '${rootPattern}' does not match URL '${url}'`;
            RootPath = (new URL(m[0])).pathname;
        }
        else
            RootPath = `${document.location.origin}${document.location.pathname}`;
        globalThis.RootPath = RootPath;
        SetDocLocation();

        const R = RHTML;
        R.Compile(elm, settings, true);
        R.ToBuild.push({parent: elm.parentElement, start: elm, bInit: true, env: NewEnv(), });

        return (R.Settings.bBuild
            ? R.DoUpdate().then(() => {elm.hidden = false} )
            : null);
    }
    catch (err) {
        window.alert(`Re-Act error: ${err}`);
    }
}


// Een context is een rij identifiers die in een te transformeren DOM-tree kunnen voorkomen, maar waarvan de waarde nog niet bekend is
type Context = Map<string, number>;
// Een environment is een rij concrete waarden voor de identifiers IN EEN GEGEVEN CONTEXT
type Environment = 
    Array<unknown> 
    & { constructDefs: Map<string, ConstructDef> };

// Een afhankelijke waarde in een gegeven context is een waarde die afhangt van een environment.
// Dit wordt de betekenis, denotatie, van een expressie van type T.
type Dependent<T> = ((env: Environment) => T) & {bUsesThis?: boolean};

type SavedContext = number;
function NewEnv(): Environment { 
    const env = [] as Environment;
    env.constructDefs = new Map();
    return env;
}
function CloneEnv(env: Environment): Environment {
    const clone = env.slice() as Environment;
    clone.constructDefs = new Map(env.constructDefs.entries());
    return clone;
}

type Marker = ChildNode & {
    nextN?: ChildNode,
    lastSub?: Marker,
    
    rResult?: unknown, 

    rValue?: unknown,
    
    prevM?: Marker, // Alleen voor FOR-iteraties
    hash?: Hash, key?: Key, keyMap?: Map<Key, Subscriber>,

    errorNode?: ChildNode,
};
type Region     = {
    parent: Node, 
    marker?: Marker, 
    start:  ChildNode & {errorNode?: ChildNode}, 
    bInit: boolean, 
    env: Environment,
    lastM?: Marker,
    lastSub?: Region,
    //parentReg?: Region,
    bNoChildBuilding?: boolean,
};
type DOMBuilder = ((reg: Region) => Promise<void>) & {bTrim?: boolean};

type ConstructDef = {instanceBuilders: ParametrizedBuilder[], constructEnv: Environment};
type ParametrizedBuilder = 
    (this: RCompiler, reg: Region, args: unknown[], mapSlotBuilders: Map<string, ParametrizedBuilder[]>, slotEnv: Environment)
    => Promise<void>;

type ParentNode = HTMLElement|DocumentFragment;

type Subscriber = {
    parent: Node,
    marker?: ChildNode, start?: ChildNode,
    env: Environment, 
    builder: DOMBuilder } 
    & ( {marker: ChildNode} | {start: ChildNode});    // Either a marker or a startnode

type Handler = (ev:Event) => any;
type LVar = (env: Environment) => (value: unknown) => void;

interface Item {};  // Three unknown but distinct types
interface Key {};
interface Hash {};

type Parameter = {name: string, pDefault: Dependent<unknown>};
class Signature {
    constructor(public srcElm: Element){ 
        this.tagName = srcElm.tagName;
    }
    public tagName: string;
    public Parameters: Array<Parameter> = [];
    public RestParam: Parameter = null;
    public Slots = new Map<string, Signature>();

    IsCompatible(sig: Signature): boolean {
        let result =
            sig
            && this.tagName == sig.tagName
            && this.Parameters.length <= sig.Parameters.length;
        
        const iter = sig.Parameters.values();
        for (const thisParam of this.Parameters) {
            const sigParam = iter.next().value as Parameter;
            result &&= thisParam.name == sigParam.name && (!thisParam.pDefault || !!sigParam.pDefault);
        }
                
        result &&= !this.RestParam || this.RestParam.name == sig.RestParam?.name;

        for (let [slotname, slotSig] of this.Slots)
            result &&= slotSig.IsCompatible(sig.Slots.get(slotname));
        
        return result;
    }
}

type RVAR_Light<T> = T & {
    _Subscribers?: Array<Subscriber>,
    _UpdatesTo?: Array<_RVAR<unknown>>,
    Subscribe?: (sub:Subscriber) => void
};

const globalEval = eval;

enum ModifType {Attr, Prop, Class, Style, Event, AddToStyle, AddToClassList, RestArgument,
    oncreate, onupdate
};
type Modifier = {
    modType: ModifType,
    name: string,
    depValue: Dependent<unknown>,
}
type RestParameter = Array<{modType: ModifType, name: string, value: unknown}>;

function ApplyModifier(elm: HTMLElement, modType: ModifType, name: string, val: unknown, bInit: boolean) {    
    switch (modType) {
        case ModifType.Attr:
            elm.setAttribute(name, val as string || ''); 
            break;
        case ModifType.Prop:
            if (val != null)
                elm[name] = val;
            else
                delete elm[name];
            break;
        case ModifType.Event:
            if (val) elm[name] = val; break;
        case ModifType.Class:
            if (val)
                elm.classList.add(name);
            break;
        case ModifType.Style:
            if (val !== undefined)
                elm.style[name] = val || '';
            break;
        case ModifType.AddToStyle:
            if (val) Object.assign(elm.style, val); break
        case ModifType.AddToClassList:
            if (Array.isArray(val))
                for (const className of val as string[])
                    elm.classList.add(className);
            else
                for (const [className, bln] of Object.entries<boolean>(val as {}))
                    if (bln)
                        elm.classList.add(className);
            break;
        case ModifType.RestArgument:
            for (const {modType, name, value} of val as RestParameter)
                ApplyModifier(elm, modType, name, value, bInit);
            break;
        case ModifType.oncreate:
            if (bInit)
                (val as ()=>void).call(elm); 
            break;
        case ModifType.onupdate:
            (val as ()=>void).call(elm); 
            break;
    }
}
function ApplyModifiers(elm: HTMLElement, modifiers: Modifier[], {env, bInit}: Region) {
    // Apply all modifiers: adding attributes, classes, styles, events
    for (const {modType, name, depValue} of modifiers) {
        try {
            const value = depValue.bUsesThis ? depValue.call(elm, env) : depValue(env);    // Evaluate the dependent value in the current environment
            // See what to do with it
            ApplyModifier(elm, modType, name, value, bInit)
        }
        catch (err) { throw `[${name}]: ${err}` }
    }
}

type Module = {Signatures: Map<string, Signature>, ConstructDefs: Map<string, ConstructDef>};
const Modules = new Map<string, Promise<Module>>();

const envActions: Array<() => void> = [];
type SavedEnv = number;
function SaveEnv(): SavedEnv {
    return envActions.length;
}
function RestoreEnv(savedEnv: SavedEnv) {
    for (let j=envActions.length; j>savedEnv; j--)
        envActions.pop()();
}
class RCompiler {

    static iNum=0;
    public instanceNum = RCompiler.iNum++;

    private ContextMap: Context;
    private context: string; 

    private Constructs: Map<string, Signature>;
    private StyleRoot: Node;
    private StyleBefore: ChildNode;
    private AddedHeaderElements: Array<HTMLElement>;

    // Tijdens de analyse van de DOM-tree houden we de huidige context bij in deze globale variabele:
    constructor(clone?: RCompiler) { 
        this.context    = clone ? clone.context : "";
        this.ContextMap = clone ? new Map(clone.ContextMap) : new Map();
        this.Constructs = clone ? new Map(clone.Constructs) : new Map();
        this.Settings   = clone ? {...clone.Settings} : {...defaultSettings};
        this.AddedHeaderElements = clone ? clone.AddedHeaderElements : [];
        this.StyleRoot  = clone ? clone.StyleRoot : document.head;
        this.StyleBefore = clone?.StyleBefore
    }

    private restoreActions: Array<() => void> = [];

    private SaveContext(): SavedContext {
        return this.restoreActions.length;
    }
    private RestoreContext(savedContext: SavedContext) {
        for (let j=this.restoreActions.length; j>savedContext; j--)
            this.restoreActions.pop()();
    }

    private NewVar(name: string): LVar {
        if (!name)
            // Lege variabelenamen staan we toe; dan wordt er niets gedefinieerd
            return (_) => (_) => {};
       
        name = CheckValidIdentifier(name);

        let i = this.ContextMap.get(name);
        const bNewName = i == null;
        if (bNewName){
            const savedContext = this.context;
            i = this.ContextMap.size;
            this.ContextMap.set(name, i);
            this.context += `${name},`
            this.restoreActions.push(
                () => { this.ContextMap.delete( name );
                    this.context = savedContext;
                }
            );
        }
        return function InitVar(env: Environment) {
            const prev = env[i], j=i;
            envActions.push( () => {env[j] = prev } );
            
            return (value: unknown) => {env[j] = value };
        }.bind(this) as LVar            
    }

    private AddConstruct(C: Signature) {
        const CName = C.tagName;
        const savedConstr = this.Constructs.get(CName);
        this.Constructs.set(CName, C);
        this.restoreActions.push(
            () => this.Constructs.set(CName, savedConstr)
        );
    }

    // Compile a source tree into an ElmBuilder
    public Compile(
        elm: HTMLElement, 
        settings: Settings,
        bIncludeSelf: boolean,  // Compile the element itself, or just its childnodes
    ) {
        this.Settings = {...defaultSettings, ...settings, };
        const t0 = performance.now();
        const savedR = RHTML; RHTML = this;
        if (bIncludeSelf)
            this.Builder = this.CompElement(elm.parentElement, elm)[0];
        else
            this.Builder = this.CompChildNodes(elm);

        this.bCompiled = true;
        RHTML = savedR;
        const t1 = performance.now();
        console.log(`Compiled ${this.sourceNodeCount} nodes in ${(t1 - t0).toFixed(1)} ms`);
    }

    public async Build(reg: Region & {marker?: ChildNode}) {
        const savedRCompiler = RHTML, {parent, start} = reg;
        RHTML = this;
        await this.Builder(reg);
        this.AllRegions.push(
            reg.marker
            ? { parent, marker: reg.marker, builder: this.Builder, env: NewEnv() }
            : { parent, start,              builder: this.Builder, env: NewEnv() }
        );
        RHTML = savedRCompiler;
    }

    public Settings: FullSettings;
    public ToBuild: Region[] = [];
    private AllRegions: Subscriber[] = [];
    private Builder: DOMBuilder;
    private bTrimLeft: boolean = false;
    private bTrimRight: boolean = false;

    private bCompiled = false;
    private bHasReacts = false;

    public DirtyVars = new Set<_RVAR<unknown>>();
    private DirtySubs = new Map<ChildNode, Subscriber>();
    public AddDirty(sub: Subscriber) {
        this.DirtySubs.set((sub.marker || sub.start), sub)
    }

    // Bijwerken van alle elementen die afhangen van reactieve variabelen
    private bUpdating = false;
    private handleUpdate: number = null;
    RUpdate() {
        //clearTimeout(this.handleUpdate);
        if (!this.handleUpdate)
            this.handleUpdate = setTimeout(() => {
                this.handleUpdate = null;
                this.DoUpdate();
            }, 0);
    };

    private buildStart: number;
    async DoUpdate() {
        if (!this.bCompiled || this.bUpdating)
            return;
        
        this.bUpdating = true;
        let savedRCompiler = RHTML;
        try {
            if (this.ToBuild.length) {
                this.buildStart = performance.now();
                this.builtNodeCount = 0;
                for (const reg of this.ToBuild)
                    await this.Build(reg);
                console.log(`Built ${this.builtNodeCount} nodes in ${(performance.now() - this.buildStart).toFixed(1)} ms`);
                this.ToBuild = [];
            }

            if (!this.bHasReacts)
                for (const s of this.AllRegions)
                    this.AddDirty(s);

            for (const rvar of this.DirtyVars)
                rvar.Save();
            this.DirtyVars.clear();
            
            if (this.DirtySubs.size) {
                RHTML = this;
                this.buildStart = performance.now();
                this.builtNodeCount = 0;
                for (const {parent, marker, start, builder, env} of this.DirtySubs.values()) {
                    const region = 
                        { parent, 
                        start: start || marker && marker.nextSibling || parent.firstChild, 
                        bInit: false,
                        env, }
                    try { 
                        await builder.call(this, region); 
                    }
                    catch (err) {
                        const msg = `ERROR: ${err}`;
                        console.log(msg);
                    }
                    finally {
                        if (!start && marker)
                            FillNextN(region, (marker as Marker).nextN)
                    }
                }
                console.log(`Updated ${this.builtNodeCount} nodes in ${(performance.now() - this.buildStart).toFixed(1)} ms`);
            }
        }
        finally { 
            this.DirtySubs.clear();
            RHTML = savedRCompiler;this.bUpdating = false;
         }
    }

    /* A "responsive variable" is a variable which listeners can subscribe to.
    */
    RVAR<T>(
        name?: string, 
        initialValue?: T, 
        store?: Store
    ) {
        return new _RVAR<T>(this, name, initialValue, store, name);
    }; // as <T>(name?: string, initialValue?: T, store?: Store) => _RVAR<T>;
    
    private RVAR_Light<T>(
        t: RVAR_Light<T>, 
        //: Array<Subscriber> = [],
        updatesTo: Array<_RVAR<unknown>> = [],
    ): RVAR_Light<T> {
        if (!t._Subscribers) {
            t._Subscribers = []; //subscribers;
            t._UpdatesTo = updatesTo;
            const R: RCompiler = this;
            Object.defineProperty(t, 'U',
                {get:
                    function() {
                        for (const sub of t._Subscribers)
                            R.AddDirty(sub);
                        if (t._UpdatesTo.length)
                            for (const rvar of t._UpdatesTo)
                                rvar.SetDirty();
                        else
                            R.RUpdate();
                        return t;
                    }
                }
            );
            t.Subscribe = function(sub: Subscriber) { t._Subscribers.push(sub) } ;
        }
        return t;
    }

    private sourceNodeCount = 0;   // To check for empty Content
    public builtNodeCount = 0;

    private CompChildNodes(
        srcParent: ParentNode,
        bBlockLevel?: boolean,
        childNodes: ChildNode[] = Array.from( srcParent.childNodes ),
        bNorestore?: boolean
    ): DOMBuilder {
        const builders = [] as Array< [DOMBuilder, ChildNode, boolean?] >;
        const saved = this.SaveContext();
        this.sourceNodeCount += childNodes.length;
        try {
            for (const srcNode of childNodes) {
                switch (srcNode.nodeType) {
                    
                    case Node.ELEMENT_NODE:
                        const builderElm = this.CompElement(srcParent, srcNode as HTMLElement, bBlockLevel);
                        if (builderElm) {
                            builders.push(builderElm);
                        
                            if (builderElm[0].bTrim) {
                                let i = builders.length - 2;
                                while (i>=0 && builders[i][2]) {
                                    srcParent.removeChild(builders[i][1]);
                                    builders.splice(i, 1);
                                    i--;
                                }
                            }
                        }
                        break;

                    case Node.TEXT_NODE:
                        let str = (srcNode as Text).data;
                        if (this.bTrimLeft && /^\s*$/.test(str))
                            str = "";
                        else
                            str = str.replace(/^\s+|\s+$/, ' ');

                        if (str != '') {
                            this.bTrimLeft = / $/.test(str);
                            const getText = this.CompInterpolatedString( str );
                            async function Text(region: Region) {
                                const {start, lastM, bInit} = region, content = getText(region.env);
                                let text: Text;
                                if (bInit && start != srcNode)
                                    text = region.parent.insertBefore(document.createTextNode(content), start);
                                else {
                                    (text = (start as Text)).data = content;
                                    region.start = start.nextSibling;
                                }
                                if (bInit)
                                    FillNextN(region, text)
                            }

                            builders.push( [ Text, srcNode, getText.isBlank] );
                        }
                        else
                            srcParent.removeChild(srcNode);
                        break;

                    default:    // Other nodes (especially comments) are removed
                        srcParent.removeChild(srcNode);
                        continue;
                }
            };
        }
        finally {
            if (!bNorestore) this.RestoreContext(saved);
        }
        return builders.length == 0 ? async ()=>{} :
             async function ChildNodes(this: RCompiler, region) {
                const savedEnv = SaveEnv();
                try {
                    for (const [builder, node] of builders)
                        await this.CallWithErrorHandling(builder, node, region);
                    this.builtNodeCount += builders.length;
                }
                finally {
                    if (!bNorestore) RestoreEnv(savedEnv);
                }
            };
    }

    static preMods = ['reacton','reactson','thisreactson'];
    private CompElement(srcParent: ParentNode, srcElm: HTMLElement, bBlockLevel?: boolean): [DOMBuilder, ChildNode] {
        const atts =  new Atts(srcElm);
        let builder: DOMBuilder = null;
        const mapReacts: Array<{attName: string, rvars: Dependent<_RVAR<unknown>>[]}> = [];
        for (const attName of RCompiler.preMods) {
            const val = atts.get(attName);
            if (val) mapReacts.push({attName, rvars: val.split(',').map( expr => this.CompJavaScript<_RVAR<unknown>>(expr) )});
        }
labelNoCheck:
        try {
            // See if this node is a user-defined construct (component or slot) instance
            const construct = this.Constructs.get(srcElm.tagName);
            if (construct)
                builder = this.CompInstance(srcParent, srcElm, atts, construct);
            else {
                switch (srcElm.tagName) {
                    case 'DEF':
                    case 'DEFINE': { // 'LET' staat de parser niet toe.
                        // En <DEFINE> moet helaas afgesloten worden met </DEFINE>; <DEFINE /> wordt niet herkend.
                        srcParent.removeChild(srcElm);
                        const rvarName = atts.get('rvar');
                        const varName = rvarName || atts.get('name') || atts.get('var', true);
                        const getValue = this.CompParameter(atts, 'value');
                        const getStore = rvarName && this.CompAttrExpression<Store>(atts, 'store');
                        const newVar = this.NewVar(varName);
                        const bReact = atts.get('reacting') != null;
                        const subBuilder = this.CompChildNodes(srcElm);

                        builder = async function DEFINE(this: RCompiler, region) {
                                const subReg = PrepareRegion(srcElm, region, undefined, undefined, varName);
                                const {marker} = subReg;
                                if (region.bInit || bReact){
                                    const value = getValue && getValue(region.env);
                                    marker.rValue = rvarName 
                                        ? new _RVAR(this, null, value, getStore && getStore(region.env), rvarName) 
                                        : value;
                                }
                                newVar(region.env)(marker.rValue);
                                await subBuilder.call(this, subReg);
                            };
                    } break;

                    case 'IF':
                    case 'CASE': {
                        const bHiding = CBool(atts.get('hiding'));
                        const caseList: Array<{
                            condition: Dependent<unknown>,
                            patt: {lvars: LVar[], regex: RegExp, url?: boolean},
                            builder: DOMBuilder, 
                            childElm: HTMLElement,
                        }> = [];
                        const getCondition = (srcElm.nodeName == 'IF') && this.CompAttrExpression<boolean>(atts, 'cond', true);
                        const getValue = this.CompAttrExpression<string>(atts, 'value');
                        atts.CheckNoAttsLeft();
                        const bodyNodes: ChildNode[] = [];
                        const bTrimLeft = this.bTrimLeft;
                        for (const child of srcElm.childNodes) {
                            if (child.nodeType == Node.ELEMENT_NODE) {
                                const childElm = child as HTMLElement;
                                const atts = new Atts(childElm);
                                this.bTrimLeft = bTrimLeft;
                                const saved = this.SaveContext();
                                try {
                                    let condition: Dependent<unknown>;
                                    let patt:  {lvars: LVar[], regex: RegExp, url?: boolean};
                                    switch (child.nodeName) {
                                        case 'WHEN':                                
                                            condition = this.CompAttrExpression<unknown>(atts, 'cond');
                                            let pattern: string;
                                            if ((pattern = atts.get('match')) != null)
                                                patt = this.CompPattern(pattern);
                                            else if ((pattern = atts.get('urlmatch')) != null)
                                                (patt = this.CompPattern(pattern)).url = true;
                                            else if ((pattern = atts.get('regmatch')) != null) {
                                                const lvars = atts.get('captures')?.split(',') || []
                                                patt = {regex: new RegExp(pattern, 'i'), lvars: lvars.map(this.NewVar.bind(this))};
                                            }
                                            else 
                                                patt = null;

                                            if (bHiding && patt?.lvars.length)
                                                throw `Pattern capturing cannot be combined with hiding`;
                                            if (patt && !getValue)
                                                throw `Match requested but no 'value' specified.`;

                                        // Fall through!
                                        case 'ELSE':
                                            const builder = this.CompChildNodes(childElm, bBlockLevel);
                                            caseList.push({condition, patt, builder, childElm});
                                            atts.CheckNoAttsLeft();
                                            continue;
                                    }
                                } 
                                catch (err) { throw `${OuterOpenTag(childElm)}${err}`  }
                                finally { this.RestoreContext(saved) }
                            }
                            bodyNodes.push(child);
                        }
                        if (getCondition)
                            caseList.unshift({
                                condition: getCondition, patt: null,
                                builder: this.CompChildNodes(srcElm, bBlockLevel, bodyNodes),
                                childElm: srcElm
                            });

                        builder = 
                            async function CASE(this: RCompiler, region) {
                                const {bInit, env} = region;
                                const value = getValue && getValue(env);
                                let choosenAlt: typeof caseList[0] = null;
                                let matchResult: RegExpExecArray;
                                for (const alt of caseList)
                                    try {
                                        if (
                                            (!alt.condition || alt.condition(env)) 
                                            && (!alt.patt || (matchResult = alt.patt.regex.exec(value)))
                                            )
                                        { choosenAlt = alt; break }
                                    } catch (err) { throw `${OuterOpenTag(alt.childElm)}${err}` }
                                if (bHiding) {
                                    // In this CASE variant, all subtrees are kept in place, some are hidden
                                    const subReg = PrepareRegion(srcElm, region, null, bInit);
                                    if (bInit && subReg.start == srcElm) {
                                        subReg.start = srcElm.firstChild;
                                        srcElm.replaceWith(...srcElm.childNodes);
                                    }
                                        
                                    for (const alt of caseList) {
                                        const bHidden = alt != choosenAlt;
                                        const elm = PrepareElement(alt.childElm, subReg);
                                        elm.hidden = bHidden;
                                        if ((!bHidden || bInit) && !region.bNoChildBuilding)
                                            await this.CallWithErrorHandling(alt.builder, alt.childElm, {parent: elm, start: elm.firstChild, bInit, env} );
                                    }
                                }
                                else {
                                    // This is the regular CASE                                
                                    const subReg = PrepareRegion(srcElm, region, choosenAlt, bInit);
                                    if (choosenAlt) {
                                        const saved = SaveEnv();
                                        try {
                                            if (choosenAlt.patt) {
                                                let i=1;
                                                for (const lvar of choosenAlt.patt.lvars)
                                                    lvar(env)(
                                                        (choosenAlt.patt.url ? decodeURIComponent : (r: string) => r)
                                                        (matchResult[i++])
                                                    );
                                            }
                                            await this.CallWithErrorHandling(choosenAlt.builder, choosenAlt.childElm, subReg );
                                        } finally { RestoreEnv(saved) }
                                    }
                                }
                        };
                        this.bTrimLeft = false;
                    } break;
                            
                    case 'FOR':
                    case 'FOREACH':
                        builder = this.CompFor(srcParent, srcElm, atts, bBlockLevel);
                    break;
                        
                    case 'INCLUDE': {
                        const src = atts.get('src', true);
                        // Placeholder that will contain a Template when the file has been received
                        let C: RCompiler = new RCompiler(this);
                        
                        const task = (async () => {
                            const textContent = await FetchText(src);
                            // Parse the contents of the file
                            const parser = new DOMParser();
                            const parsedContent = parser.parseFromString(textContent, 'text/html') as HTMLDocument;

                            // Compile the parsed contents of the file in the original context
                            C.Compile(parsedContent.body, this.Settings, false);
                            this.bHasReacts ||= C.bHasReacts;
                        })();

                        builder = 
                            // Runtime routine
                            async function INCLUDE(this: RCompiler, region) {
                                const t0 = performance.now();
                                await task;
                                this.buildStart += performance.now() - t0;
                                const subReg = PrepareRegion(srcElm, region, null, true);
                                await C.Builder(subReg);
                                this.builtNodeCount += C.builtNodeCount;
                            };
                    } break;

                    case 'IMPORT': {
                        const src = atts.get('src', true);
                        const listImports = new Array<[Signature, ConstructDef]>();
                        const dummyEnv = NewEnv();
                        
                        for (const child of srcElm.children) {
                            const signature = this.ParseSignature(child);
                            const holdOn: ParametrizedBuilder =
                            async function holdOn(this: RCompiler, region, args, mapSlotBuilders, slotEnv) {
                                const t0 = performance.now();
                                await task;
                                this.buildStart += performance.now() - t0;
                                region.env = placeholder.constructEnv;
                                for (const builder of placeholder.instanceBuilders)
                                    await builder.call(this, region, args, mapSlotBuilders, slotEnv);
                            }
                            const placeholder: ConstructDef = {instanceBuilders: [holdOn], constructEnv: dummyEnv} ;

                            listImports.push([signature, placeholder]);
                            
                            this.AddConstruct(signature);
                        }
                        const compiler = new RCompiler();
                        compiler.Settings.bRunScripts = true;
                        
                        const task =
                            (async () => {
                                let promiseModule = Modules.get(src);
                                if (!promiseModule) {
                                    promiseModule = FetchText(src)
                                    .then(async textContent => {
                                        // Parse the contents of the file
                                        const parser = new DOMParser();
                                        const parsedContent = parser.parseFromString(textContent, 'text/html') as HTMLDocument;
                                        const builder = compiler.CompChildNodes(parsedContent.body, true, undefined, true);
                                        this.bHasReacts ||= compiler.bHasReacts;

                                        const env = NewEnv();
                                        await builder.call(this, {parent: parsedContent.body, start: null, bInit: true, env});
                                        return {Signatures: compiler.Constructs, ConstructDefs: env.constructDefs};
                                    });
                                    Modules.set(src, promiseModule);
                                }
                                const module = await promiseModule;
                                
                                for (const [clientSig, placeholder] of listImports) {
                                    const {tagName} = clientSig;
                                    const signature = module.Signatures.get(tagName);
                                    if (!signature)
                                        throw `<${tagName}> is missing in '${src}'`;
                                    if (!clientSig.IsCompatible(signature))
                                        throw `Import signature ${clientSig.srcElm.outerHTML} is incompatible with module signature ${signature.srcElm.outerHTML}`;
                                    
                                    const constructdef = module.ConstructDefs.get(tagName);
                                    placeholder.instanceBuilders = constructdef.instanceBuilders;
                                    placeholder.constructEnv = constructdef.constructEnv;
                                }
                            })();
                        
                        srcParent.removeChild(srcElm);

                        builder = async function IMPORT({env}: Region) {
                            for (const [{tagName: TagName}, constructDef] of listImports.values()) {
                                const prevDef = env.constructDefs.get(TagName);
                                env.constructDefs.set(TagName, constructDef);
                                envActions.push(
                                    () => { env.constructDefs.set(TagName,  prevDef) }
                                );
                            }
                        }

                    }; break

                    case 'REACT': {
                        this.bHasReacts = true;
                        const reacts = atts.get('on', true, true);
                        const getDependencies = reacts ? reacts.split(',').map( expr => this.CompJavaScript<_RVAR<unknown>>(expr) ) : [];

                        // We transformeren de template in een routine die gewenste content genereert
                        const bodyBuilder = this.CompChildNodes(srcElm, bBlockLevel);
                        
                        builder = async function REACT(this: RCompiler, region) {
                            let subReg = PrepareRegion(srcElm, region);

                            if (subReg.bInit) {
                                if (subReg.start == srcElm) {
                                    subReg.start = srcElm.firstChild;
                                    srcElm.replaceWith(...srcElm.childNodes );
                                }

                                const subscriber: Subscriber = {
                                    parent: subReg.parent, marker: subReg.marker,
                                    builder: bodyBuilder,
                                    env: CloneEnv(subReg.env),
                                };
                        
                                // Subscribe bij de gegeven variabelen
                                for (const getRvar of getDependencies) {
                                    const rvar = getRvar(subReg.env);
                                    rvar.Subscribe(subscriber);
                                }
                            }
        
                            await bodyBuilder.call(this, subReg);
                        }
                    } break;

                    case 'RHTML': {
                        const bodyBuilder = this.CompChildNodes(srcElm, bBlockLevel);
                        srcParent.removeChild(srcElm);
                        //const bEncapsulate = CBool(atts.get('encapsulate'));
                        let preModifiers: Modifier[];
                        //if (bEncapsulate)
                            preModifiers = this.CompAttributes(atts).preModifiers;

                        builder = async function RHTML(this: RCompiler, region) {
                            const tempElm = document.createElement('RHTML');
                            await bodyBuilder.call(this, {parent: tempElm, start: null, env: region.env, bInit: true});
                            const result = tempElm.innerText

                            let {bInit} = region;
                            
                            const elm = PrepareElement(srcElm, region, 'rhtml-rhtml');
                            ApplyModifiers(elm, preModifiers, region);

                            const shadowRoot = bInit ? elm.attachShadow({mode: 'open'}) : elm.shadowRoot;
                            if (bInit || result != elm['rResult']) {
                                elm['rResult'] = result;
                                shadowRoot.innerHTML = '';
                                tempElm.innerHTML = result;
                                const R = new RCompiler();
                                R.StyleRoot = shadowRoot;

                                try {
                                    const hdrElms = elm['AddedHdrElms'] as Array<HTMLElement>;
                                    if (hdrElms) {
                                        for (const elm of hdrElms) elm.remove();
                                        elm['AddedHdrElms'] = null;
                                    }
                                    R.Compile(tempElm, {bRunScripts: true }, false);
                                    elm['AddedHdrElms'] = R.AddedHeaderElements;
                                    
                                    const subReg = PrepareRegion(srcElm, {parent: shadowRoot, start: null, bInit: true, env: NewEnv()});
                                    R.StyleBefore = subReg.marker;
                                    await R.Build(subReg);
                                    this.builtNodeCount += R.builtNodeCount;
                                }
                                catch(err) {
                                    shadowRoot.appendChild(createErrorNode(`Compile error: ${err}`))
                                }
                            }
                        };
                    } break;

                    case 'SCRIPT': 
                        builder = this.CompScript(srcParent, srcElm as HTMLScriptElement, atts); break;

                    case 'STYLE':
                        builder = this.CompStyle(srcElm); break;

                    case 'COMPONENT': 
                        builder = this.CompComponent(srcParent, srcElm, atts); break;

                    default:             
                        /* It's a regular element that should be included in the runtime output */
                        builder = this.CompHTMLElement(srcElm, atts); 
                        break labelNoCheck;
                }
                atts.CheckNoAttsLeft();
            }
        }
        catch (err) { 
            throw `${OuterOpenTag(srcElm)} ${err}`;
        }

        for (const {attName, rvars} of mapReacts) {   
            const bNoChildUpdates = (attName == 'thisreactson')
                , bodyBuilder = builder;
            builder = async function REACT(this: RCompiler, region) {
                const subReg = PrepareRegion(srcElm, region, null, null, attName);
                await bodyBuilder.call(this, subReg);

                if (region.bInit) {
                    const subscriber: Subscriber = {
                        parent: region.parent, marker: subReg.marker,
                        builder: async function reacton(this: RCompiler, reg: Region) {
                            if (bNoChildUpdates && !reg.bInit) reg.bNoChildBuilding = true;
                            await this.CallWithErrorHandling(bodyBuilder, srcElm, reg);
                            this.builtNodeCount ++;
                        },
                        env: CloneEnv(region.env),
                    };
            
                    // Subscribe bij de gegeven variabelen
                    for (const getRvar of rvars) {
                        const rvar = getRvar(region.env);
                        rvar.Subscribe(subscriber);
                    }
                }
            }
            this.bHasReacts = true;
        }
        if (builder)
            return [builder, srcElm];
        return null;
    }

    private async CallWithErrorHandling(this: RCompiler, builder: DOMBuilder, srcNode: ChildNode, region: Region){
        let start: typeof region.start;
        if ((start = region.start) && start.errorNode) {
            region.parent.removeChild(start.errorNode);
            start.errorNode = undefined;
        }
        try {
            //await builder(region);
            await builder.call(this, region);
        } 
        catch (err) { 
            const message = 
                srcNode instanceof HTMLElement ? `${OuterOpenTag(srcNode, 40)} ${err}` : err;
            if (this.Settings.bAbortOnError)
                throw message;
            console.log(message);
            if (this.Settings.bShowErrors) {
                const errorNode =
                    region.parent.insertBefore(createErrorNode(message), region.start);
                if (start ||= region.marker)
                    start.errorNode = errorNode;
            }
        }
    }

    private CompScript(this:RCompiler, srcParent: ParentNode, srcElm: HTMLScriptElement, atts: Atts) {
        srcParent.removeChild(srcElm);
        const bModule = atts.get('type') == 'module';
        const src = atts.get('src');

        if ( atts.get('nomodule') != null || this.Settings.bRunScripts) {
            if (src) {
                srcElm.noModule = false;
                document.body.appendChild(srcElm);
                this.AddedHeaderElements.push(srcElm);
            }
            else {
                let script = srcElm.text+'\n';
                const defines = atts.get('defines');
                if (src && defines) throw `'src' and'defines' cannot be combined (yet)`
                const lvars: LVar[] = [];
                if (defines) {
                    for (let name of defines.split(','))
                        lvars.push(this.NewVar(name));
                    
                    let exports: Array<unknown>;
                    async function SCRIPT({env}: Region) {
                        let i=0;
                        for (const lvar of lvars)
                            lvar(env)(exports[i++]);
                    }
                    // Execute the script now
                    if (bModule) {
                        // Thanks https://stackoverflow.com/a/67359410/2061591
                        const objectURL = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
                        const task = import(objectURL);
                        return async function SCRIPT(reg: Region) {
                            if (!exports) exports = await task;
                            await SCRIPT(reg);
                        }
                    }
                    else {
                        exports = globalEval(`'use strict'\n;${script};[${defines}]\n`) as Array<unknown>;
                        return SCRIPT;
                    }    
                }   
                else
                    globalEval(`'use strict';{${script}}`);
            }        
        }
        return null;
    }

    public CompFor(this: RCompiler, srcParent: ParentNode, srcElm: HTMLElement, atts: Atts, bBlockLevel: boolean): DOMBuilder {
        const varName = atts.get('let');
        let indexName = atts.get('index');
        if (indexName == '') indexName = 'index';
        const saved = this.SaveContext();
        try {
            if (varName != null) { /* A regular iteration */
                const getRange = this.CompAttrExpression<Iterable<Item>>(atts, 'of', true);
                let prevName = atts.get('previous');
                if (prevName == '') prevName = 'previous';
                let nextName = atts.get('next');
                if (nextName == '') nextName = 'next';

                const bReactive = CBool(atts.get('updateable') ?? atts.get('reactive'));
                const getUpdatesTo = this.CompAttrExpression<_RVAR<unknown>>(atts, 'updates');
            
                // Voeg de loop-variabele toe aan de context
                const initVar = this.NewVar(varName);
                // Optioneel ook een index-variabele, en een variabele die de voorgaande waarde zal bevatten
                const initIndex = this.NewVar(indexName);
                const initPrevious = this.NewVar(prevName);
                const initNext = this.NewVar(nextName);

                const getKey = this.CompAttrExpression<Key>(atts, 'key');
                const getHash = this.CompAttrExpression<Hash>(atts, 'hash');

                // Compileer alle childNodes
                const bodyBuilder = this.CompChildNodes(srcElm);
                
                srcParent.removeChild(srcElm);

                // Dit wordt de runtime routine voor het updaten:
                return async function FOREACH(this: RCompiler, region: Region) {
                    let subReg = PrepareRegion(srcElm, region, null, (getKey == null));
                    let {parent, marker, start, env} = subReg;
                    const savedEnv = SaveEnv();
                    try {
                        // Map of previous data, if any
                        const keyMap: Map<Key, Subscriber>
                            = (region.bInit ? marker.keyMap = new Map() : marker.keyMap);
                        // Map of the newly obtained data
                        const newMap: Map<Key, {item:Item, hash:Hash}> = new Map();
                        const setVar = initVar(env);

                        const iterator = getRange(env);
                        if (iterator !== undefined) {
                            if (!iterator || !(iterator[Symbol.iterator] || iterator[Symbol.asyncIterator]))
                                throw `[of]: Value (${iterator}) is not iterable`;
                            for await (const item of iterator) {
                                setVar(item);
                                const hash = getHash && getHash(env);
                                const key = getKey ? getKey(env) : hash;
                                if (key != null && newMap.has(key))
                                    throw `Key '${key}' is not unique`;
                                newMap.set(key ?? {}, {item, hash});
                            }
                        }

                        function RemoveStaleItemsHere() {
                            let key: Key;
                            while (start && start != region.start && !newMap.has(key = (start as Marker).key)) {
                                if (key != null)
                                    keyMap.delete(key);
                                const nextMarker = (start as Marker).nextN || region.start;
                                while (start != nextMarker) {
                                    const next = start.nextSibling;
                                    parent.removeChild(start);
                                    start = next;
                                }
                            }
                        }

                        const setIndex = initIndex(env);
                        const setPrevious = initPrevious(env);
                        const setNext = initNext(env);

                        let index = 0, prevItem: Item = null, nextItem: Item
                            , prevM: Marker = null;
                        const nextIterator = nextName ? newMap.values() : null;
                        let childRegion: ReturnType<typeof PrepareRegion>;

                        if (nextIterator) nextIterator.next();
                        RemoveStaleItemsHere();

                        // Voor elke waarde in de range
                        for (const [key, {item, hash}] of newMap) {
                            if (nextIterator)
                                nextItem = nextIterator.next().value?.item;

                            let subscriber = keyMap.get(key), childMark: Marker;
                            if (subscriber && (childMark = subscriber.marker).isConnected) {
                                // Item already occurs in the series
                                const nextMarker = childMark.nextN;
                                
                                if (childMark != start) {
                                    // Item has to be moved
                                    SetNextN(childMark.prevM, childMark.nextN);
                                    if (childMark.nextN)
                                        (childMark.nextN as Marker).prevM = childMark.prevM;
                                    let node = childMark
                                    while(node != nextMarker) {
                                        const next = node.nextSibling;
                                        parent.insertBefore(node, start);
                                        node = next;
                                    }
                                    SetNextN(childMark, start);
                                }
                                //else debugger //marker.nextM klopt niet
                                
                                (childMark as Comment).textContent = `${varName}(${index})`;

                                subReg.bInit = false;
                                subReg.start = childMark;
                                FillNextN(subReg, childMark);
                                childRegion = PrepareRegion(null, subReg, null, false);
                                subReg.lastM = childMark;
                            }
                            else {
                                // Item has to be newly created
                                subReg.bInit = true;
                                subReg.start = start;
                                childRegion = PrepareRegion(null,  subReg, null, true, `${varName}(${index})`);
                                subscriber = {
                                    ...childRegion,
                                    builder: (bReactive ? bodyBuilder : undefined),
                                    env: (bReactive ? CloneEnv(env) : undefined), 
                                }
                                if (key != null) {
                                    if (keyMap.has(key))
                                        throw `Duplicate key '${key}'`;
                                    keyMap.set(key, subscriber);
                                }
                                childMark = childRegion.marker
                                childMark.key = key;
                            }
                            childMark.prevM = prevM; prevM = childMark;

                            if (hash != null
                                && ( hash == childMark.hash as Hash
                                    || (childMark.hash = hash, false)
                                    )
                            ) { 
                                // Nothing
                            }
                            else {
                                // Environment instellen
                                let rvar: Item =
                                    ( getUpdatesTo ? this.RVAR_Light(item as object, [getUpdatesTo(env)])
                                    : bReactive ? this.RVAR_Light(item as object)
                                    : item
                                    );
                                setVar(rvar);
                                setIndex(index);
                                setPrevious(prevItem);
                                if (nextIterator)
                                    setNext(nextItem)

                                // Body berekenen
                                await bodyBuilder.call(this, childRegion);
                                if (bReactive)
                                    (rvar as _RVAR<Item>).Subscribe(subscriber);
                            }

                            prevItem = item;
                            index++;
                            
                            start = subReg.start;
                            RemoveStaleItemsHere();
                        }
                        marker.lastSub = childRegion.marker;
                        //SetNextN(childRegion.marker, region.start);
                    }
                    finally { RestoreEnv(savedEnv) }
                };
            }
            else { 
                /* Iterate over multiple slot instances */
                const slotName = atts.get('of', true, true);
                const slot = this.Constructs.get(slotName)
                if (!slot)
                    throw `Missing attribute [let]`;

                const initIndex = this.NewVar(indexName);
                const bodyBuilder = this.CompChildNodes(srcElm, bBlockLevel);
                srcParent.removeChild(srcElm);

                return async function FOREACH_Slot(this: RCompiler, region: Region) {
                    const subReg = PrepareRegion(srcElm, region);
                    const env = subReg.env;
                    const saved= SaveEnv();
                    const slotDef = env.constructDefs.get(slotName);
                    try {
                        const setIndex = initIndex(region.env);
                        let index = 0;
                        for (const slotBuilder of slotDef.instanceBuilders) {
                            setIndex(index++);
                            env.constructDefs.set(slotName, {instanceBuilders: [slotBuilder], constructEnv: slotDef.constructEnv});
                            await bodyBuilder.call(this, subReg);
                        }
                    }
                    finally {
                        env.constructDefs.set(slotName, slotDef);
                        RestoreEnv(saved);
                    }
                }
            }
        }
        finally { this.RestoreContext(saved) }
    }

    private ParseSignature(elmSignature: Element):  Signature {
        const signature = new Signature(elmSignature);
        for (const attr of elmSignature.attributes) {
            if (signature.RestParam) 
                throw `Rest parameter must be the last`;
            const m = /^(#|\.\.\.)?(.*?)(\?)?$/.exec(attr.name);
            if (m[1] == '...')
                signature.RestParam = {name: m[2], pDefault: undefined};
            else
                signature.Parameters.push(
                    { name: m[2]
                    , pDefault: 
                        attr.value != '' 
                        ? (m[1] == '#' ? this.CompJavaScript(attr.value) :  this.CompInterpolatedString(attr.value))
                        : m[3] ? (_) => undefined
                        : null 
                    }
                );
            }
        for (const elmSlot of elmSignature.children)
            signature.Slots.set(elmSlot.tagName, this.ParseSignature(elmSlot));
        return signature;
    }

    private CompComponent(srcParent: ParentNode, srcElm: HTMLElement, atts: Atts): DOMBuilder {
        srcParent.removeChild(srcElm);

        const builders: [DOMBuilder, ChildNode][] = [];
        let signature: Signature, elmTemplate: HTMLTemplateElement;
        const bEncapsulate = CBool(atts.get('encapsulate'));
        const styles: Node[] = [];

        for (const srcChild of Array.from(srcElm.children) as Array<HTMLElement>  ) {
            const childAtts = new Atts(srcChild);
            let builder: DOMBuilder;
            switch (srcChild.nodeName) {
                case 'SCRIPT':
                    builder = this.CompScript(srcElm, srcChild as HTMLScriptElement, childAtts);
                    break;
                case 'STYLE':
                    if (bEncapsulate)
                        styles.push(srcChild);
                    else
                        this.CompStyle(srcChild);
                    
                    break;
                case 'TEMPLATE':
                    if (elmTemplate) throw 'Double <TEMPLATE>';
                    elmTemplate = srcChild as HTMLTemplateElement;
                    break;
                default:
                    if (signature) throw 'Double signature';
                    signature = this.ParseSignature(srcChild);
                    break;
            }
            if (builder) builders.push([builder, srcChild]);
        }
        if (!signature) throw `Missing signature`;
        if (!elmTemplate) throw 'Missing <TEMPLATE>';

        if (bEncapsulate && !signature.RestParam)
            signature.RestParam = {name: null, pDefault: null}
        this.AddConstruct(signature);
        
        
        const {tagName} = signature;
        // Deze builder bouwt de component-instances op
        const instanceBuilders = [
            this.CompTemplate(signature, elmTemplate.content, elmTemplate, 
                false, bEncapsulate, styles)
        ];

        // Deze builder zorgt dat de environment van de huidige component-DEFINITIE bewaard blijft
        return ( 
            async function COMPONENT(this: RCompiler, region: Region) {
                for (const [bldr, srcNode] of builders)
                    await this.CallWithErrorHandling(bldr, srcNode, region);

                // At runtime, we just have to remember the environment that matches the context
                // And keep the previous remembered environment, in case of recursive constructs
                const construct = {instanceBuilders, constructEnv: undefined as Environment};
                const {env} = region;
                const prevDef = env.constructDefs.get(tagName);
                env.constructDefs.set(tagName, construct);
                construct.constructEnv = CloneEnv(env);     // Contains circular reference to construct
                envActions.push(
                    () => { env.constructDefs.set(tagName,  prevDef) }
                );
            } );
    }

    private CompTemplate(signat: Signature, contentNode: ParentNode, srcElm: HTMLElement, 
        bNewNames: boolean, bEncaps?: boolean, styles?: Node[], atts?: Atts
    ): ParametrizedBuilder
    {
        const names: string[] = [], saved = this.SaveContext();
        let bCheckAtts: boolean;
        if (bCheckAtts = !atts)
            atts = new Atts(srcElm);
        for (const param of signat.Parameters)
            names.push( atts.get(param.name, bNewNames) || param.name);
        const {tagName, RestParam} = signat;
        if (RestParam?.name)
            names.push( atts.get(`...${RestParam.name}`, bNewNames) || RestParam.name);

        for (const S of signat.Slots.values())
            this.AddConstruct(S);
        if (bCheckAtts)
            atts.CheckNoAttsLeft();
        try {
            const lvars: LVar[] = names.map(name => this.NewVar(name));
            const builder = this.CompChildNodes(contentNode);
            const customName = /^[A-Z].*-/.test(tagName) ? tagName : `RHTML-${tagName}`;

            return async function TEMPLATE(this: RCompiler, region: Region, args: unknown[], mapSlotBuilders, slotEnv) {
                const saved = SaveEnv();
                const {env, bInit} = region;
                try {
                    for (const [slotName, instanceBuilders] of mapSlotBuilders) {
                        const savedDef = env.constructDefs.get(slotName);
                        envActions.push(
                            () => { env.constructDefs.set(slotName, savedDef) }
                        );
                        env.constructDefs.set(slotName, {instanceBuilders, constructEnv: slotEnv});
                    }
                    let i = 0;
                    for (const lvar of lvars)
                        lvar(region.env)(args[i++]);

                    if (bEncaps) {
                        const elm = PrepareElement(srcElm, region, customName);
                        const shadow = bInit ? elm.attachShadow({mode: 'open'}) : elm.shadowRoot;
                        region = {parent: shadow, start: null, bInit, env};
                        if (bInit)
                            for (const style of styles)
                                shadow.appendChild(style.cloneNode(true));
                        else
                            region.start = shadow.children[styles.length];

                        if (args[i])
                            ApplyModifier(elm, ModifType.RestArgument, null, args[i], bInit);
                    }
                    await builder.call(this, region); 
                }
                finally { RestoreEnv(saved) }}

        }
        catch (err) {throw `${OuterOpenTag(srcElm)} ${err}` }
        finally { this.RestoreContext(saved) }
    }


    private CompInstance(
        srcParent: ParentNode, srcElm: HTMLElement, atts: Atts,
        signature: Signature
    ) {
        srcParent.removeChild(srcElm);
        const tagName = signature.tagName;
        const getArgs: Array<Dependent<unknown>> = [];

        for (const {name, pDefault} of signature.Parameters)
            getArgs.push( this.CompParameter(atts, name, !pDefault) || pDefault );

        const slotBuilders = new Map<string, ParametrizedBuilder[]>();
        for (const name of signature.Slots.keys())
            slotBuilders.set(name, []);

        let slotElm: HTMLElement, Slot: Signature;
        for (const node of Array.from(srcElm.childNodes))
            if (node.nodeType == Node.ELEMENT_NODE 
                && (Slot = signature.Slots.get((slotElm = (node as HTMLElement)).tagName))
            ) {
                slotBuilders.get(slotElm.tagName).push(
                    this.CompTemplate(Slot, slotElm, slotElm, true)
                );
                srcElm.removeChild(node);
            }
        
        const contentSlot = signature.Slots.get('CONTENT');
        if (contentSlot)
            slotBuilders.get('CONTENT').push(
                this.CompTemplate(contentSlot, srcElm, srcElm, true, false, null, atts)
            );

        const preModifiers = signature.RestParam ? this.CompAttributes(atts).preModifiers: null;

        atts.CheckNoAttsLeft();
        this.bTrimLeft = false;

        return async function INSTANCE(this: RCompiler, region: Region) {
            const subReg = PrepareRegion(srcElm, region);
            const localEnv = subReg.env;

            // The construct-template(s) will be executed in this construct-env
            const {instanceBuilders, constructEnv} =  localEnv.constructDefs.get(tagName);

            const savedEnv = SaveEnv();
            try {
                const args: unknown[] = [];
                for ( const getArg of getArgs)
                    args.push(getArg(localEnv));
                
                if (signature.RestParam) {
                    const rest: RestParameter = [];
                    for (const {modType, name, depValue} of preModifiers)
                        rest.push({modType, name, value: depValue(localEnv)})
                    
                    args.push(rest);
                }
                
                const slotEnv = signature.Slots.size ? CloneEnv(localEnv) : null;

                subReg.env = constructEnv
                for (const parBuilder of instanceBuilders) 
                    await parBuilder.call(this, subReg, args, slotBuilders, slotEnv);
            }
            finally { 
                RestoreEnv(savedEnv);
             }
        }
    }

    private CompHTMLElement(srcElm: HTMLElement, atts: Atts) {
        // Remove trailing dots
        const nodeName = srcElm.nodeName.replace(/\.+$/, '');
        const bTrim = /^(BLOCKQUOTE|D[DLT]|DIV|FORM|H\d|HR|LI|OL|P|TABLE|T[RHD]|UL)$/.test(nodeName)

        // We turn each given attribute into a modifier on created elements
        const {preModifiers, postModifiers} = this.CompAttributes(atts);

        if (bTrim) this.bTrimLeft = true;
        // Compile the given childnodes into a routine that builds the actual childnodes
        const childnodesBuilder = this.CompChildNodes(srcElm, bTrim);
        if (bTrim) this.bTrimLeft = true;

        // Now the runtime action
        const builder = async function ELEMENT(this: RCompiler, region: Region) {
            //*
            const {start, bInit, env} = region;
            let elm = PrepareElement(srcElm, region, nodeName);

            if (elm == start)
                elm.removeAttribute('class');
            
            if (!region.bNoChildBuilding)
                // Add all children
                await childnodesBuilder.call(this, {parent: elm, start: elm.firstChild, bInit, env, });

            ApplyModifiers(elm, preModifiers, region);

            ApplyModifiers(elm, postModifiers, region)
        };

        builder.bTrim = bTrim;
        return builder;
    }

    private CompAttributes(atts: Atts) { 
        const preModifiers: Array<Modifier> = [], postModifiers: Array<Modifier> = [];

        for (const [attName, attValue] of atts) {
            let m: RegExpExecArray;
            try {
                if (m = /^on(create|update)$/i.exec(attName))
                    postModifiers.push({
                        modType: ModifType[attName], 
                        name: m[0], 
                        depValue: this.CompJavaScript<Handler>(
                            `function ${attName}(){${attValue}\n}`)
                    });
                else if (m = /^on(.*)$/i.exec(attName))               // Events
                    preModifiers.push({
                        modType: ModifType.Event, 
                        name: CapitalizeProp(m[0]), 
                        depValue: this.CompJavaScript<Handler>(
                            `function ${attName}(event){${attValue}\n}`)
                    });
                else if (m = /^#class:(.*)$/.exec(attName))
                    preModifiers.push({
                        modType: ModifType.Class, name: m[1],
                        depValue: this.CompJavaScript<boolean>(attValue)
                    });
                else if (m = /^#style\.(.*)$/.exec(attName))
                    preModifiers.push({
                        modType: ModifType.Style, name: CapitalizeProp(m[1]),
                        depValue: this.CompJavaScript<unknown>(attValue)
                    });
                else if (m = /^style\.(.*)$/.exec(attName))
                    preModifiers.push({
                        modType: ModifType.Style, name: CapitalizeProp(m[1]),
                        depValue: this.CompInterpolatedString(attValue)
                    });
                else if (attName == '+style')
                    preModifiers.push({
                        modType: ModifType.AddToStyle, name: null,
                        depValue: this.CompJavaScript<object>(attValue)
                    });
                else if (m = /^#(.*)/.exec(attName))
                    preModifiers.push({
                        modType: ModifType.Prop, name: CapitalizeProp(m[1]),
                        depValue: this.CompJavaScript<unknown>(attValue)
                    });
                else if (attName == "+class")
                    preModifiers.push({
                        modType: ModifType.AddToClassList, name: null,
                        depValue: this.CompJavaScript<object>(attValue)
                    });
                else if (m = /^([*@])(\1)?(.*)$/.exec(attName)) { // *, **, @, @@
                    const propName = CapitalizeProp(m[3]);                    
                    try {
                        const setter = this.CompJavaScript<Handler>(
                            `function(){const ORx=this.${propName};if(${attValue}!==ORx)${attValue}=ORx}`);
                        if (m[1] == '@')
                            preModifiers.push({ modType: ModifType.Prop, name: propName, depValue: this.CompJavaScript<unknown>(attValue) });
                        else
                            postModifiers.push({ modType: ModifType.oncreate, name: 'oncreate', depValue: setter });
                        preModifiers.push({modType: ModifType.Event, name: m[2] ? 'onchange' : 'oninput', depValue: setter});
                    }
                    catch(err) { throw `Invalid left-hand side '${attValue}'`}
                }
                else if (m = /^\.\.\.(.*)/.exec(attName)) {
                    if (attValue) throw `Rest parameter cannot have a value`;
                    preModifiers.push({
                        modType: ModifType.RestArgument, name: null,
                        depValue: this.CompName(m[1])
                    });
                }
                else
                    preModifiers.push({
                        modType: ModifType.Attr, name: attName,
                        depValue: this.CompInterpolatedString(attValue)
                    });
            }
            catch (err) {
                throw(`[${attName}]: ${err}`)
            }
        }
        atts.clear();
        return {preModifiers, postModifiers};
    }

    private CompStyle(srcStyle: HTMLElement): DOMBuilder  {
        this.StyleRoot.appendChild(srcStyle);
        this.AddedHeaderElements.push(srcStyle);
        return null;
        /*
        return (this.StyleRoot==document.head 
            ? this.CompCSSRuleList(document.styleSheets[document.styleSheets.length-1].cssRules)
            : null);
        */
    }
/*
    private CompStyleTemplate(srcParent: ParentNode, srcStyle1: HTMLElement, atts: Atts) {
        srcParent.removeChild(srcStyle1);
        const styleElement = document.createElement('STYLE') as HTMLStyleElement;
        styleElement.media = atts.get('media') ?? "";
        let depText = this.CompInterpolatedString(srcStyle1.textContent);

        return async (reg: Region)=> {
            if (reg.bInit && styleElement.isConnected)
                throw `A <STYLE.> stylesheet template cannot be invoked more than once`;
            styleElement.textContent = depText(reg.env);
            this.StyleRoot.insertBefore(styleElement, this.StyleBefore);
        }
    }
*/
/*
    private CompCSSRuleList(cssRules: CSSRuleList){
        const ruleSetters: Array<{
            style: CSSStyleDeclaration, 
            prop: string, 
            depValue: Dependent<string>, 
        }> = [];
        for (const  cssRule of cssRules)
            switch (cssRule.type) {
                case CSSRule.STYLE_RULE: {
                    const {style} = cssRule as CSSStyleRule;
                    for (const prop of style){
                        const depValue = this.CompInterpolatedString(style.getPropertyValue(prop), prop, true);
                        if (depValue)
                            ruleSetters.push({style, prop, depValue});
                    }
                }; break;
            }
        return (ruleSetters.length
            ? async ({env}: Region) => {
                for (const {style, prop, depValue} of ruleSetters)
                    style.setProperty(prop, depValue(env), style.getPropertyPriority(prop));
            }
            : null);
    }
//*/
    private CompInterpolatedString(data: string, name?: string): Dependent<string> & {isBlank?: boolean} {
        const generators: Array< string | Dependent<unknown> > = []
            , regIS = /(?<![\\$])\$?\{((\{(\{.*?\}|.)*?\}|'.*?'|".*?"|`.*?`|.)*?)(?<!\\)\}|$/gs;
        let isBlank = true, isTrivial = true;

        while (regIS.lastIndex < data.length) {
            const lastIndex = regIS.lastIndex, m = regIS.exec(data)
                , fixed = lastIndex < m.index ? data.substring(lastIndex, m.index) : null;

            if (fixed)
                generators.push( fixed.replace(/\\([${}\\])/g, '$1') );  // Replace '\{' etc by '{'
            if (m[1] || /[^ \t\r\n]/.test(fixed)) {
                isBlank = false;
                if (m[1]) {
                    generators.push( this.CompJavaScript<string>(m[1], '{}') );
                    isTrivial = false;
                }
            }
        }
        
        let dep: Dependent<string> & {isBlank?: boolean};
        if (isTrivial) {
            const result = (generators as Array<string>).join('');
            dep = () => result;
        } else
            dep = (env: Environment) => {
                    try {
                        let result = "";
                        for (const gen of generators)
                            result += ( typeof gen == 'string' ? gen : gen(env) ?? '');
                        return result;
                    }
                    catch (err) { throw name ? `[${name}]: ${err}` : err }
                };
        dep.isBlank = isBlank;
        dep.bUsesThis = false;
        return dep;
    }

    // Compile a 'regular pattern' into a RegExp and a list of bound LVars
    private CompPattern(patt:string): {lvars: LVar[], regex: RegExp, url?: boolean}
    {
        let reg = '', lvars: LVar[] = [];
        
        // These are the subpatterns that are need converting; all remaining characters are literals and will be quoted when needed
        const regIS =
            /(?<![\\$])\$?\{(.*?)(?<!\\)\}|\?|\*|(\\.)|\[\^?(?:\\.|[^\\\]])*\]|$/gs;

        while (regIS.lastIndex < patt.length) {
            const lastIndex = regIS.lastIndex
            const m = regIS.exec(patt);
            const literals = patt.substring(lastIndex, m.index);

            if (literals)
                reg += quoteReg(literals);
            if (m[1]) {     // A capturing group
                reg += `(.*?)`;
                lvars.push(this.NewVar(m[1]));
            }
            else if (m[0] == '?')
                reg += '.';
            else if (m[0] == '*')
                reg += '.*';
            else if (m[2])  // An escaped character
                reg += m[2]
            else            // A character class
                reg += m[0];
        }

        return {lvars, regex: new RegExp(`^${reg}$`, 'i')}; 
    }

    private CompParameter(atts: Atts, attName: string, bRequired?: boolean): Dependent<unknown> {
        const value = atts.get(attName);
        return (
            value == null ? this.CompAttrExpression(atts, attName, bRequired)
            : /^on/.test(attName) ? this.CompJavaScript(`function ${attName}(event){${value}\n}`)
            : this.CompInterpolatedString(value)
        );
    }
    private CompAttrExpression<T>(atts: Atts, attName: string, bRequired?: boolean) {
        return this.CompJavaScript<T>(atts.get(attName, bRequired, true));
    }

    private CompJavaScript<T>(
        expr: string,           // Expression to transform into a function
        delims: string = '""'   // Delimiters to put around the expression when encountering a compiletime or runtime error
        , descript?: string             // To be inserted in an errormessage
    ): Dependent<T> {
        if (expr == null) return null;

        const bThis = /\bthis\b/.test(expr),
            depExpr = bThis ?
                `'use strict';(function expr([${this.context}]){return (${expr}\n)})`
                : `'use strict';([${this.context}])=>(${expr}\n)`
            , errorInfo = `${descript ? `[${descript}] ` : ''}${delims[0]}${Abbreviate(expr,60)}${delims[1]}: `;

        try {
            const routine = globalEval(depExpr) as (env:Environment) => T
            , depValue = (bThis
                ? function (this: HTMLElement, env: Environment) {
                        try { return routine.call(this, env); } 
                        catch (err) { throw `${errorInfo}${err}`; }
                    }
                : (env: Environment) => {
                        try { return routine(env); } 
                        catch (err) { throw `${errorInfo}${err}`; }
                    }
                ) as Dependent<T>;
            depValue.bUsesThis = bThis;
            return depValue;
        }
        catch (err) { throw `${errorInfo}${err}` }             // Compiletime error
    }
    private CompName(name: string): Dependent<unknown> {
        const i = this.ContextMap.get(name);
        if (i === undefined) throw `Unknown name '${name}'`;
        return env => env[i];
    }
}
/*
    start['endNode'] is defined, en is gelijk aan end: de regio is al eerder voorbereid.
        start is dan het al eerder ingevoegde Comment, en moet overgeslagen worden.
    
    Anders moet de regio voorbereid worden door een start- en eind-Comment in te voegen.
    Het start-comment is nodig als vaste markering als de inhoud verandert.
    Het eindcomment is soms nodig opdat de inhoud een vast eindpunt heeft.

    Het kan zijn dat het bron-element er nog staat; dat is dan gelijk aan start.
        De start-markering moet dan geplaatst worden vóór dit bron-element, en de eind-markering er direct ná
    Anders worden zowel start- als eindmarkering vóór 'start' geplaatst.
*/
function PrepareRegion(srcElm: HTMLElement, region: Region, result: unknown = null, bForcedClear: boolean = false, text: string = '')
    : Region & {marker: Marker}
{
    let {parent, start, bInit, env} = region;
    let marker: Marker;
    if (bInit) {
        (marker = 
            parent.insertBefore(
                document.createComment(`${srcElm ? srcElm.tagName : ''} ${text}`)
                , start
            ) as Marker
        ).nextN = null;
        FillNextN(region, marker);
        region.lastM = marker;
        if (region.marker)
            region.marker.lastSub = marker;
        
        if (start && start == srcElm)
            region.start = start.nextSibling;
    }
    else {
        marker = start;
        region.start = marker.nextN;
        start = marker.nextSibling;
    }

    if (bForcedClear || (result != marker.rResult ?? null)) {
        marker.rResult = result;
        while (start != region.start) {
            const next = start.nextSibling;
            parent.removeChild(start);
            start = next;
        }
        bInit = true;
    }
    return {parent, marker, start, bInit, env};
}
function FillNextN(reg: Region, nextN: ChildNode) {
    //SetNextN(reg.lastM, nextN);
    //*
    do {
        if (!reg.lastM) break;
        reg.lastM.nextN = nextN;
        reg.lastM = null;
        reg = reg.lastSub;
    } while (reg);
    //*/
}
function SetNextN(marker: Marker, nextN: ChildNode) {
    while (marker) {
        marker.nextN = nextN;
        marker = marker.lastSub;
    }
}

function PrepareElement(srcElm: HTMLElement, region: Region, nodeName = srcElm.nodeName): HTMLElement {
    const {start, bInit} = region;
    let elm: HTMLElement;
    if (!bInit || start == srcElm) {
        region.start = start.nextSibling;
        elm = start as HTMLElement;

        if (elm == srcElm && elm.nodeName != nodeName) {
            (elm = document.createElement(nodeName)).append(...start.childNodes);
            region.parent.replaceChild(elm, start);
        }
    }
    else
        elm =  region.parent.insertBefore<HTMLElement>(document.createElement(nodeName), start);

    if (bInit) {
        FillNextN(region, elm);
        if (region.marker)
            region.marker.lastSub = null;
    }
    return elm;
}

function quoteReg(fixed: string) {
    return fixed.replace(/[.()?*+^$\\]/g, s => `\\${s}`);
}

interface Store {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
class _RVAR<T>{
    constructor(
        private rRuntime: RCompiler,
        globalName?: string, 
        initialValue?: T, 
        private store?: Store,
        private storeName?: string,
    ) {
        if (globalName) globalThis[globalName] = this;
        
        let s: string;
        if ((s = store && store.getItem(`RVAR_${storeName}`)) != null)
            try {
                this._Value = JSON.parse(s);
                return;
            }
            catch{}
        this._Value = initialValue;
        this.storeName ||= globalName;
    }
    // The value of the variable
    private _Value: T;
    // The subscribers
    // .Elm is het element in de DOM-tree dat vervangen moet worden door een uitgerekende waarde
    // .Content is de routine die een nieuwe waarde uitrekent
    Subscribers: Set<Subscriber> = new Set();

    Subscribe(s: Subscriber) {
        this.Subscribers.add(s);
    }

    // Use var.V to get or set its value
    get V() { return this._Value }
    // When setting, it will be marked dirty.
    set V(t: T) {
        if (t !== this._Value) {
            this._Value = t;
            this.SetDirty();
        }
    }

    // Use var.U to get its value for the purpose of updating some part of it.
    // It will be marked dirty.
    // Set var.U to have the DOM update immediately.
    get U() { this.SetDirty();  return this._Value }
    set U(t: T) { this.V = t }

    public SetDirty() {
        if (this.store)
            this.rRuntime.DirtyVars.add(this);
        for (const sub of this.Subscribers)
            if (sub.parent.isConnected)
                this.rRuntime.AddDirty(sub);
            else
                this.Subscribers.delete(sub);
        this.rRuntime.RUpdate();
    }

    public Save() {
        this.store.setItem(`RVAR_${this.storeName}`, JSON.stringify(this._Value));
    }
}

class Atts extends Map<string,string> {
    constructor(elm: HTMLElement) {
        super();
        for (const att of elm.attributes)
            if (!/^_/.test(att.name))
                super.set(att.name, att.value);
    }

    public get(name: string, bRequired?: boolean, bHashAllowed?: boolean) {
        let n = name, value = super.get(n);
        if (value==null && bHashAllowed) {
            n = `#${name}`;
            value = super.get(n);
        }
        if (value != null)
            super.delete(n);
        else if (bRequired)
            throw `Missing attribute [${name}]`;
        return value;
    }

    public CheckNoAttsLeft() {  
        if (super.size)
            throw `Unknown attribute${super.size > 1 ? 's' : ''}: ${Array.from(super.keys()).join(',')}`;
    }
}

const regIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/
    , regReserved = /^(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|enum|implements|interface|let|package|private|protected|public|static|yield|null|true|false)$/;

function CheckValidIdentifier(name: string) {
    // Anders moet het een geldige JavaScript identifier zijn
    name = name.trim();
    if (!regIdentifier.test(name) )
        throw `Invalid identifier '${name}'`;
    if (regReserved.test(name))
        throw `Reserved keyword '${name}'`;
    return name;
}

// Capitalization of property names
// The first character that FOLLOWS on one of these words will be capitalized.
// In this way, we don't have to list all words that occur as property name final words.
const words = '(?:align|animation|aria|auto|background|blend|border|bottom|bounding|break|caption|caret|child|class|client'
+ '|clip|(?:col|row)(?=span)|column|content|element|feature|fill|first|font|get|grid|image|inner|^is|last|left|margin|max|min|node|offset|outer'
+ '|outline|overflow|owner|padding|parent|right|size|rule|scroll|selected|table|tab(?=index)|text|top|value|variant)';
const regCapitalize = new RegExp(`html|uri|(?<=${words})[a-z]`, "g");
function CapitalizeProp(lcName: string) {
    return lcName.replace(regCapitalize, (char) => char.toUpperCase());
}

function OuterOpenTag(elm: HTMLElement, maxLength?: number): string {
    return Abbreviate(/<.*?(?=>)/.exec(elm.outerHTML)[0], maxLength-1) + '>';
}
function Abbreviate(s: string, maxLength: number) {
    return (maxLength && s.length > maxLength
        ? s.substr(0, maxLength - 3) + "..."
        : s);
}

function CBool(s: string|boolean, valOnEmpty: boolean = true): boolean {
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

//function thrower(err: string = 'Internal error'): never { throw err }

function createErrorNode(message: string) {
    const node = document.createElement('div');        
    node.style.color = 'crimson';
    node.style.fontFamily = 'sans-serif';
    node.style.fontSize = '10pt';
    node.innerText = message;
    return node;
}

async function FetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok)
        throw `GET '${url}' returned ${response.status} ${response.statusText}`;
    return await response.text();
}

export let RHTML = new RCompiler();

Object.defineProperties(
    globalThis, {
        RVAR:       {get: () => RHTML.RVAR.bind(RHTML)},
        RUpdate:    {get: () => RHTML.RUpdate.bind(RHTML)},
    }
);
globalThis.RCompile = RCompile;
export const 
    RVAR = globalThis.RVAR as <T>(name?: string, initialValue?: T, store?: Store) => _RVAR<T>, 
    RUpdate = globalThis.RUpdate as () => void;

export function* range(from: number, upto?: number, step: number = 1) {
	if (upto === undefined) {
		upto = from;
		from = 0;
	}
	for (let i= from; i<upto; i += step)
		yield i;
}
globalThis.range = range;

export const docLocation: _RVAR<Location> & {subpath?: string} = RVAR<Location>('docLocation', document.location);
function SetDocLocation()  { 
    docLocation.SetDirty();
    if (RootPath)
        docLocation.subpath = document.location.pathname.substr(RootPath.length);
}
window.addEventListener('popstate', SetDocLocation );
export const reroute = globalThis.reroute = (arg: Event | string) => {
    history.pushState(null, null, typeof arg=='string' ? arg : (arg.target as HTMLAnchorElement).href );
    SetDocLocation();
    return false;
}