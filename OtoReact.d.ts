declare const defaultSettings: {
    bTiming: boolean;
    bAbortOnError: boolean;
    bShowErrors: boolean;
    bRunScripts: boolean;
    bBuild: boolean;
    rootPattern: string;
    preformatted: any[];
    bNoGlobals: boolean;
    bDollarRequired: boolean;
    bSetPointer: boolean;
};
declare type DOMBuilder = ((reg: Area) => Promise<void>) & {
    ws?: boolean;
    auto?: boolean;
};
declare type Area = {
    range?: Range;
    parent: Node;
    env: Environment;
    before?: Comment;
    source?: ChildNode;
    parentR?: Range;
    prevR?: Range;
    bNoChildBuilding?: boolean;
};
declare class Range<NodeType extends ChildNode = ChildNode> {
    node?: NodeType;
    text?: string;
    child: Range;
    next: Range;
    endMark?: Comment;
    constructor(node?: NodeType, text?: string);
    toString(): string;
    result?: any;
    value?: any;
    errorNode?: ChildNode;
    hash?: Hash;
    key?: Key;
    prev?: Range;
    fragm?: DocumentFragment;
    rvar?: RVAR_Light<Item>;
    updated?: number;
    get First(): ChildNode;
    Nodes(): Generator<ChildNode>;
    get isConnected(): boolean;
}
declare type Environment = Array<unknown> & {
    constructs: Map<string, ConstructDef>;
};
declare type FullSettings = typeof defaultSettings;
declare type Settings = Partial<FullSettings>;
export declare function RCompile(elm: HTMLElement, settings?: Settings): Promise<void>;
export declare function RBuild(): Promise<void>;
declare type Subscriber<T = unknown> = ((t?: T) => (void | Promise<void>)) & {
    ref?: {
        isConnected: boolean;
    };
    sArea?: Area;
    bImm?: boolean;
};
declare type ParentNode = HTMLElement | DocumentFragment;
declare type ConstructDef = {
    templates: Template[];
    constructEnv: Environment;
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
    private clone?;
    static iNum: number;
    instanceNum: number;
    private ContextMap;
    private context;
    private cRvars;
    private CSignatures;
    private head;
    private StyleBefore;
    private AddedHeaderElements;
    FilePath: string;
    RootElm: ParentNode;
    constructor(clone?: RCompiler);
    private get MainC();
    private restoreActions;
    private SaveContext;
    private RestoreContext;
    private NewVar;
    private AddConstruct;
    Compile(elm: ParentNode, settings?: Settings, bIncludeSelf?: boolean): void;
    logTime(msg: string): void;
    private mPreformatted;
    Subscriber({ parent, before, bNoChildBuilding, env }: Area, builder: DOMBuilder, range: Range, ...args: any[]): Subscriber;
    InitialBuild(area: Area): Promise<void>;
    Settings: FullSettings;
    private AllAreas;
    private Builder;
    private wspc;
    private bCompiled;
    DirtyVars: Set<RVAR<unknown>>;
    private DirtySubs;
    AddDirty(sub: Subscriber): void;
    private bUpdating;
    private bUpdate;
    private handleUpdate;
    RUpdate(): void;
    start: number;
    DoUpdate(): Promise<void>;
    RVAR<T>(name?: string, initialValue?: T | Promise<T>, store?: Store, subs?: (t: T) => void): _RVAR<T>;
    private RVAR_Light;
    private sourceNodeCount;
    builtNodeCount: number;
    private CompChildNodes;
    private CompIterator;
    static genAtts: RegExp;
    private CompElement;
    private GetREACT;
    private CallWithHandling;
    private CompScript;
    CompFor(this: RCompiler, srcParent: ParentNode, srcElm: HTMLElement, atts: Atts): DOMBuilder;
    private ParseSignature;
    private CompComponent;
    private CompTemplate;
    private CompInstance;
    static regBlock: RegExp;
    static regInline: RegExp;
    private CompHTMLElement;
    private CompAttributes;
    private CompStyle;
    private regIS;
    private CompString;
    private CompPattern;
    private CompParameter;
    private CompAttrExpr;
    private CompHandler;
    private CompJScript;
    private CompName;
    private compAttrExprList;
    private GetURL;
    private GetPath;
    FetchText(src: string): Promise<string>;
}
export declare function RFetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
interface Store {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
declare class _RVAR<T = unknown> {
    private MainC;
    private store?;
    private storeName?;
    constructor(MainC: RCompiler, globalName?: string, initialValue?: T | Promise<T>, store?: Store, storeName?: string);
    private _Value;
    _Subscribers: Set<Subscriber<T>>;
    auto: Subscriber;
    Subscribe(s: Subscriber<T>, bImmediate?: boolean, bInit?: boolean): void;
    Unsubscribe(s: Subscriber<T>): void;
    get V(): T;
    set V(t: T);
    get Set(): any;
    SetAsync(t: T | Promise<T>): void;
    get U(): T;
    set U(t: T);
    SetDirty(): void;
    Save(): void;
}
export interface RVAR<T = unknown> extends _RVAR<T> {
}
declare class Atts extends Map<string, string> {
    constructor(elm: HTMLElement);
    get(name: string, bRequired?: boolean, bHashAllowed?: boolean): string;
    CheckNoAttsLeft(): void;
}
export declare let R: RCompiler;
export declare const RVAR: <T>(name?: string, initialValue?: T | Promise<T>, store?: Store) => RVAR<T>, RUpdate: () => void;
declare const _range: (from: number, upto?: number, step?: number) => Generator<number, void, unknown>;
export { _range as range };
export declare const docLocation: RVAR<string> & {
    subpath?: string;
    searchParams?: URLSearchParams;
};
export declare const reroute: (arg: MouseEvent | string) => void;
