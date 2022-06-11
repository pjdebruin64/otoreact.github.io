declare let defaultSettings: {
    bTiming: boolean;
    bAbortOnError: boolean;
    bShowErrors: boolean;
    bRunScripts: boolean;
    bBuild: boolean;
    basePattern: string;
    preformatted: any[];
    bNoGlobals: boolean;
    bDollarRequired: boolean;
    bSetPointer: boolean;
    bKeepWhiteSpace: boolean;
    bKeepComments: boolean;
};
declare type DOMBuilder = ((reg: Area) => Promise<void>) & {
    ws?: boolean;
    auto?: boolean;
};
declare type Area = {
    range?: Range;
    parent: Node;
    before?: ChildNode;
    source?: ChildNode;
    parentR?: Range;
    prevR?: Range;
    bRootOnly?: boolean;
};
declare class Range<NodeType extends ChildNode = ChildNode> {
    node: NodeType;
    text?: string;
    child: Range;
    next: Range;
    parentR?: Range;
    newParent?: Node;
    constructor(node: NodeType, area: Area, text?: string);
    toString(): string;
    result?: any;
    value?: any;
    errorNode?: ChildNode;
    erased?: boolean;
    hash?: Hash;
    key?: Key;
    prev?: Range;
    fragm?: DocumentFragment;
    rvar?: RVAR_Light<Item>;
    iSub?: Subscriber<Item>;
    updated?: number;
    subs?: Subscriber;
    rvars?: RVAR[];
    get First(): ChildNode;
    get Next(): ChildNode;
    get FirstOrNext(): ChildNode;
    Nodes(): Generator<ChildNode>;
    erase(parent: Node): void;
}
declare type Environment = Array<unknown> & {
    constructs: Map<string, ConstructDef>;
};
declare type FullSettings = typeof defaultSettings;
declare type Settings = Partial<FullSettings>;
export declare function RCompile(elm: HTMLElement, settings?: Settings): Promise<void>;
export declare function RBuild(): Promise<void>;
declare type Subscriber<T = unknown> = ((t?: T) => (void | Promise<void>)) & {
    ref?: {};
    sArea?: Area;
    bImm?: boolean;
    env?: Environment;
};
declare type ParentNode = HTMLElement | DocumentFragment;
declare type ConstructDef = {
    nm: string;
    templates: Template[];
    constructEnv?: Environment;
};
declare type Template = (this: RCompiler, area: Area, args: unknown[], mSlotTemplates: Map<string, Template[]>, slotEnv: Environment) => Promise<void>;
export declare type RVAR_Light<T> = T & {
    _Subscribers?: Set<Subscriber>;
    _UpdatesTo?: Array<RVAR>;
    Subscribe?: (sub: Subscriber) => void;
    readonly U?: T;
};
interface Item {
}
interface Key {
}
interface Hash {
}
declare class RCompiler {
    static iNum: number;
    num: number;
    private RC;
    private ContextMap;
    private context;
    private CSignatures;
    private cRvars;
    private head;
    private StyleBefore;
    private AddedHdrElms;
    FilePath: string;
    RootElm: ParentNode;
    constructor(RC?: RCompiler, bClr?: boolean);
    private restoreActions;
    private SaveCont;
    private RestoreCont;
    private NewVar;
    private SetVar;
    private NewVars;
    private AddConstruct;
    Compile(elm: ParentNode, settings?: Settings, childnodes?: Iterable<ChildNode>): Promise<void>;
    logTime(msg: string): void;
    private mPreformatted;
    Subscriber({ parent, bRootOnly }: Area, builder: DOMBuilder, range: Range, ...args: any[]): Subscriber;
    Build(area: Area): Promise<void>;
    Settings: FullSettings;
    private Builder;
    private bCompiled;
    private wspc;
    private rspc;
    DirtyVars: Set<RVAR<unknown>>;
    private DirtySubs;
    AddDirty(sub: Subscriber): void;
    private bUpdating;
    private bUpdate;
    private handleUpdate;
    RUpdate(): void;
    start: number;
    DoUpdate(): Promise<void>;
    RVAR<T>(nm?: string, value?: T | Promise<T>, store?: Store, subs?: (t: T) => void, storeName?: string): _RVAR<T>;
    private RVAR_Light;
    private sourceNodeCount;
    private CompChildNodes;
    private CompIter;
    static genAtts: RegExp;
    private CompElm;
    private GetREACT;
    private CallWithHandling;
    private CompScript;
    CompFor(this: RCompiler, srcElm: HTMLElement, atts: Atts): Promise<DOMBuilder>;
    private CompDefine;
    private ParseSignat;
    private CompComponent;
    private CompTemplate;
    private CompInstance;
    static regBlock: RegExp;
    static regInline: RegExp;
    private CompHTMLElement;
    private CompAttribs;
    private CompStyle;
    private regIS;
    private CompString;
    private CompPattern;
    private CompParam;
    private CompAttrExpr;
    private CompHandler;
    private CompJScript;
    private CompName;
    private compAttrExprList;
    private AddErrH;
    private GetURL;
    private GetPath;
    FetchText(src: string): Promise<string>;
    fetchModule(src: string, bInclHead?: boolean): Promise<Iterable<ChildNode>>;
}
export declare function RFetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
interface Store {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
declare class _RVAR<T = unknown> {
    private RC;
    private store?;
    private storeName;
    constructor(RC: RCompiler, name?: string, initialValue?: T | Promise<T>, store?: Store, storeName?: string);
    private _Value;
    _Subscribers: Set<Subscriber<T>>;
    auto: Subscriber;
    Subscribe(s: Subscriber<T>, bImmediate?: boolean, bInit?: boolean): void;
    Unsubscribe(s: Subscriber<T>): void;
    get V(): T;
    set V(t: T);
    SetAsync(t: T | Promise<T>): void;
    get Set(): any;
    get Clear(): () => void;
    get U(): T;
    set U(t: T);
    SetDirty(): void;
    Save(): void;
}
export interface RVAR<T = unknown> extends _RVAR<T> {
}
declare class Atts extends Map<string, string> {
    constructor(elm: HTMLElement);
    get(nm: string, bRequired?: boolean, bHashAllowed?: boolean): string;
    getB(nm: string): boolean;
    ChkNoAttsLeft(): void;
}
declare let _range: (from: number, upto?: number, step?: number) => Generator<number, void, unknown>;
export declare let R: RCompiler, RVAR: <T>(name?: string, initialValue?: T | Promise<T>, store?: Store, subs?: Subscriber, storeName?: string) => RVAR<T>, RUpdate: () => void, docLocation: RVAR<string> & {
    basepath: string;
    subpath: string;
    searchParams: URLSearchParams;
    search: (key: string, value: string) => void;
}, reroute: (arg: MouseEvent | string) => void;
export { _range as range };
