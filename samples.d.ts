declare let bRSTYLE: boolean;
declare const mapping: {
    '<': string;
    '>': string;
    '&': string;
}, quoteHTML: (s: any) => any, markJScript: (script: string) => string, markTag: (mTag: string) => string, reg: RegExp, ColorCode: (html: string) => any;
declare function Indent(text: string, n: number): string;
declare const sampleGreeting = "<!-- Create a local reactive variable (RVAR) to receive the entered name -->\n<DEFINE rvar='yourName'></DEFINE>\n\n<p>\n    What's your name?\n    <!-- The value of the RVAR ('yourName.V') is bound to the value of the input element -->\n    <input type=text @value=\"yourName.V\">\n</p>\n\n<!-- If yourName.V is nonempty, -->\n<IF cond=\"yourName.V\">\n    <!-- then we show: -->\n    <p>\n        Nice to meet you, {yourName.V}. <!-- yourName.V is inserted here -->\n        <br>By the way, your name consists of {yourName.V.length} characters.\n    </p>\n</IF>", fileTemplate = "<!DOCTYPE html>\n<html>\n    <head>\n        <script type=module src=\"OtoReact.js\"></script>\n    </head>\n    <body rhtml>\n\n        <!-- Here goes your RHTML -->\n\n    </body>\n</html>\n", sampleServerData2 = "<style>\n  table.colorTable {\n    margin: auto;\n  }\n  table.colorTable td {\n    padding: 0px 4px;\n    text-align: center;\n    max-width: 8em;\n    overflow:hidden;\n    font-size: small;\n  }\n  div.scrollbox {\n    height:45em;\n    width:100%;\n    overflow-y:scroll;\n  }\n\n  @keyframes Disappearing {\n    from {line-height: 100%}\n    to   {line-height: 0%}\n  }  \n  table.animate > tbody > tr:first-child {\n    animation: Disappearing 280ms linear 30ms forwards\n  }\n</style>\n\n<!-- We tell OtoReact to define these names in global scope. -->\n<script type=otoreact defines=\"ColorTable,toHex,handle,StartStop\" >\n\n// Here we store the data as an Array<{name:string, red:number, green:number, blue:number}>\nconst ColorTable = RVAR( null,\n  /* Asynchronously fetch the data.\n    When the data has been received, the RVAR will be updated and the table will be drawn.\n   */\n  RFetch(\"webColors.json\").then(response => response.json())\n);\n\n/* Utility for 2-digit hex code */\nfunction toHex(n){ \n  return n.toString(16).toUpperCase().padStart(2,'0');\n}\n\n/* Rotation */\nlet handle=RVAR();\n\nfunction StartStop() {\n  if (handle.V > 0) {\n    clearInterval(handle.V);\n    handle.V = -1;\n  }\n  else\n    // Modify the data array every 330ms; the DOM table will automatically be updated accordingly.\n    handle.V = setInterval( () => ColorTable.U.push(ColorTable.V.shift()) , 330)\n}\n</script>\n\n<div class=scrollbox>\n<!--\n    The dots behind tag names are needed because HTML does not allow <FOR> as a child of <TABLE>.\n    OtoReact removes these dots.\n-->\n<table. class=colorTable\n        #class:animate=\"handle.V\" thisreactson=handle>\n\n  <!-- Table caption -->\n  <caption.>Web Colors \n    <button onclick=\"StartStop();\" reacton=handle style=\"float:right; width:5em\">\n        {handle.V > 0 ? 'Stop' : 'Rotate'}\n    </button>\n  </caption.>\n\n  <!-- Column headers -->\n  <tr.>\n    <th.>Name</th.>\n    <th.>R</th.> <th.>G</th.> <th.>B</th.>\n    <th.>Hex</th.>\n  </tr.>\n\n  <!-- Detail records -->\n  <tbody.>\n    <FOR let=C of=\"ColorTable.V\" hash=C reacton=ColorTable>\n      <tr. \n        style.backgroundColor=\"rgb({C.red},{C.green},{C.blue})\" \n        #style.color = \"C.green<148 ? 'white' : 'black'\"\n      >\n        <td.>{C.name}</td.>\n        <td.>{C.red}</td.>\n        <td.>{C.green}</td.>\n        <td.>{C.blue}</td.>\n        <td.>\n          #{toHex(C.red)+toHex(C.green)+toHex(C.blue)}\n        </td.>\n      </tr.>\n    </FOR>\n  </tbody.>\n\n</table.>\n</div>";
declare const sampleBraces = "1 + 1 = {1 + 1}  \\{ Check }\n<p>\nNull and undefined are not shown:\n  \"{null} {undefined}\".\n<br>\nCompare this JavaScript template literal:\n  \"{ `${null} ${undefined}` }\".\n<p>\nTag <{}br> looks better in source code than &lt;br&gt;";
declare const sampleGreeting2 = "<!-- Create a \"Reactive variable\" with a local name and\n   persisted in localStorage -->\n<define rvar='yourName' store=sessionStorage></define>\n\n<p>What's your name?\n  <input type=text @value=\"yourName.V\">\n  <!-- The \"@\" introduces a two-way binding for the input element.\n  Anytime an input event happens, 'yourName.V' will be updated, and the DOM as well  -->\n</p>\n<if cond=\"yourName.V\">\n  <p> Nice to meet you, {yourName.V}.\n    <br>By the way, your name consists of {yourName.V.length} \n        characters.\n  </p>\n</if>";
declare const sampleSqrt = "<define rvar=x #value=2></define>\n<p  title=\"sqrt({x.V}) = {Math.sqrt(x.V)}\"\n>\n    What is sqrt({x.V})? Check the tooltip.\n</p>\n<button onclick=\"x.V += 1\">Increment</button>";
declare const sampleInlineStyles = "<p style.backgroundColor=lightgrey> Light grey </p>\n\n<define var=color value=\"red\"></define>\n<p #style.backgroundColor=\"color\"> Colored </p>\n\n<define var=myStyle \n  #value=\"{color: 'blue',fontStyle: 'italic'}\"\n></define>\n<p +style=\"myStyle\">My style</p>";
declare const sampleParticipants = "<!-- Here we use a local RVAR -->\n<define rvar=Participants #value=\"['Joe', 'Mary', 'Eileen']\"></define>\n\n<b>Participants:</b>\n<ul>\n    <for let=participant of=\"Participants.V\">\n        <li>{participant}</li>\n    </for>\n</ul>\n\nNew participant (Enter):\n<br><input type=text onchange=\"\n      if(this.value) {\n          Participants.U.push(this.value);\n          this.value=''; \n      }\n\">\n<!-- \"this\" in all RHTML event handlers refers to the target element.\n  Getting \"Participants.U\" means \"Participants\" will be marked as changed, even though it is not assigned to. -->";
declare const sampleTODO = "<script type=otoreact defines=AddItem,TODO>\n    // Define the data model of our todo list\n    let TODO = RVAR('TODO',\n        [['Visit Joe', true], ['Fishing',false], ['Sleeping',false], ['Working',false]]\n        , sessionStorage\n    );\n\n    // Adding an item to the list\n    function AddItem(inputElem) {\n        if (inputElem.value) {\n            TODO.U.push( [inputElem.value, false] );\n            inputElem.value = '';\n        }\n    }\n</script>\n\n<!-- Define a component, showing a filtered list of to-do-items, with a caption -->\n<component>\n    <!-- This is the component signature -->\n    <ItemList caption bDone></ItemList>\n\n    <template>\n        <p><b>{caption}</b></p>\n        <p>\n            <for let=item of=TODO.V key=item reacton=TODO reactive>\n                <!-- 'bdone' must be in lowercase -->\n                <if cond='item[1] == bdone'>\n                    <label style=\"display: block\">\n                      <input type=checkbox @checked='item.U[1]'> \n                      {item[0]}\n                    </label>\n                </if>\n            </for>\n        </p>\n    </template>\n</component>\n\n<!-- We create two component instances: one list of undone items: -->\n<ItemList caption='To do:' #bDone=false></ItemList>\n\n<!-- and one list of completed items: -->\n<ItemList caption='Done:'  #bDone=true ></ItemList>\n\n<!-- Adding an item -->\n<p>\n    New item (Enter):\n    <br>\n    <input type=text onchange=\"AddItem(this)\">\n</p>";
declare const sampleRecursion = "<component recursive>\n    <ShowList #arg></ShowList>\n\n    <style>\n        .ShowList {\n            display: flex; flex-wrap: wrap; align-items: center;\n            background-color: goldenrod;\n        }\n        .ShowList > div {\n            background-color: lemonchiffon;\n            margin: 4px; padding: 8px; font-size: 18px;\n        }\n    </style>\n\n    <template #arg>\n        <if cond=\"Array.isArray(arg)\">\n            <then>\n                <div class=ShowList>\n                    <for let=item of=arg>\n                        <div>\n                            <!-- Recursive invocation -->\n                            <ShowList #arg=item></ShowList>\n                        </div>\n                    </for>\n                </div>\n            </then>\n            <else>\n                {arg}\n            </else>\n        </if>\n    </template>\n</component>   \n\n<define rvar=list \n  value=\"[1, [2,3], [4,[ ,[[42]]], 5, 'Otolift']]\"\n  store=sessionStorage\n></define>\n\n<p>\n    JavaScript list: <input type=text @value=\"list.V\" size=30>\n</p>\n\n<ShowList #arg=\"eval(list.V)\"></ShowList>\n<p>\n    You can modify the JavaScript list above and see the result.\n</p>";
declare const sampleRedefineA = "<component>\n  <a href #target? ...rest><content></content></a>\n\n  <template><a. #href=\"href\"\n    #target=\"!target && /^http/i.test(href) ? '_blank' : target\"\n    ...rest\n    ><content>\n  </content></a.></template>\n</component>\n\nThis link opens in a blank window:\n<a href=\"https://www.otolift.com/\">Otolift Stairlifts</a>";
declare const sampleA = "<import src=\" OtoLib.html\"><a></a></import>\n\n<p>This link opens in a blank window:\n<a href=\"https://www.otolift.com/\">Otolift Stairlifts</a>\n\n<p>This link navigates within the current window:\n<a href=\"./#Introduction\">Introduction</a>";
declare const sampleTableMaker = "<style>\ntd { text-align: center }\n</style>\n\n<component>\n  <TableMaker datasource ...rest>\n      <!-- One column header definition -->\n      <HDef></HDef>\n      <!-- One column detail definition -->\n      <DDef item></DDef>\n  </TableMaker>\n\n  <template>\n      <table. ...rest>\n          <!-- Header row -->\n          <tr.>\n              <for of=HDef>\n                  <th.><HDef></HDef></th.>\n              </for>\n          </tr.>\n          <!-- Detail rows -->\n          <for let=rec of='datasource'>\n              <tr.>\n                  <for of=DDef>\n                      <td.><DDef #item=rec></DDef></td.>\n                  </for>\n              </tr.>\n          </for>\n      </table.>\n  </template>\n</component>\n\n<!-- Some data -->\n<script type=otoreact defines=tableData,thisYear>\n  const tableData = [\n      {name:'Piet',\t\tyear: 2004}, \n      {name:'Tine',\tyear: 2003},\n  {name: 'Alex',\tyear: 1960}\n  ];\n\n  const thisYear = new Date().getFullYear();\n</script>\n\n<!-- The actual table definition, column by column: -->\n<TableMaker #datasource='tableData' style=\"border-spacing: 20px 0px;\">\n  <!-- First column -->\n  <HDef>Name</HDef>\n  <DDef item>{item.name}</DDef>\n\n  <!-- Second column -->\n  <HDef>Birth year</HDef>\n  <DDef item>{item.year}</DDef>\n\n  <!-- Third column -->\n  <HDef>Age</HDef>\n  <DDef item>{thisYear -  item.year}</DDef>\n</TableMaker>\n";
declare const sampleTicTacToe = "<!-- Styles are global; we must use a class to restrict these rules to the current demo -->\n<style>\n    div.tic-tac-toe {\n        display:grid;\n        grid-template-columns: auto 120pt;\n        background-color: white;\n    }\n    .tic-tac-toe table {\n        width: fit-content;\n        margin:1ex\n    }\n    .tic-tac-toe td {\n        height: 4ex; width: 4ex;\n        padding: 0px;\n        border: 2px solid;\n        line-height: 1;\n        text-align: center;\n        vertical-align: middle;\n    }\n    .tic-tac-toe button {\n        font-size: 80%;\n    }\n</style>\n\n<!-- By using a local script, multiple instances of this game will have their own state -->\n<script type=\"otoreact/local\" \n  defines=\"board,toMove,outcome,ClearAll,Move,CheckWinner\"\n>\n    let\n      board =    RVAR(),           // State of the board\n      toMove =   RVAR(null, '\u2715'), // Player to move: '\u25EF' or '\u2715'\n      outcome =  RVAR(),    // Player that has won, or boolean true when it's a draw\n      count = 0;            // Number of moves made\n\n    function ClearAll() {\n        // Initialize the board as an array of arrays of objects {P: '\u25EF' | '\u2715'}\n        board.V = Board();\n        // Reset the outcome\n        outcome.V = null;\n        count = 0;\n        \n        function Cell() {return {P: null}; }\n        function Row()  {return [Cell(), Cell(), Cell()]; }\n        function Board(){return [Row(), Row(), Row()]; }\n    }\n\n    ClearAll();\n\n    function Move(cell) {\n        // Play a move, when allowed\n        if (outcome.V || cell.P) // Move not allowed\n          return;\n        cell.U.P = toMove.V; // Update the cell\n        toMove.V = (toMove.V=='\u2715' ? '\u25EF' : '\u2715'); // Set next player to move\n        count++;   // Count moves\n        outcome.V = CheckWinner(board.V) || count==9; // Check end of game\n    }\n\n    function CheckWinner(b) {\n        // Check if there is a winner\n        let w = null;\n        for (let i=0;i<3;i++) {\n            w = w || CheckRow(...b[i]);   // Horizontal row\n            w = w || CheckRow(b[0][i], b[1][i], b[2][i]); // Vertical row\n        }\n        for (let i=-1;i<=1;i+=2)\n            w = w || CheckRow(b[0][1+i], b[1][1], b[2][1-i]); // Diagonal row\n        return w;\n\n        function CheckRow(c1, c2, c3) {\n            // Return the result when the three cells have the same state\n            return (c1.P == c2.P && c2.P == c3.P && c1.P);\n        }\n  }\n</script>\n\n<div class=tic-tac-toe>\n  <!-- Caption -->\n  <div style=\"grid-column: 1/3; text-align: center;\">\n    <b>Tic-Tac-Toe</b>\n  </div>\n\n  <!-- Show the board -->\n  <table. reacton=board>\n          <!-- This table should react on the RVAR 'board'. -->\n    <for let=row of=\"board.V\">\n      <tr.>\n        <for let=cell of=\"row\" reacting>\n          <td. onclick=\"Move(cell)\"\n           >{cell.P}</td.>\n        </for>\n      </tr.>\n    </for>\n  </table.>\n  \n  <!-- Show either the outcome, or the player to move -->\n  <div>\n    <p reacton=outcome,toMove>\n      <case>\n        <when cond=\"outcome.V===true\">\n          <b>It's a draw.</b>\n        </when>\n        <when cond=\"outcome.V\">\n          <b>The winner is: <large>{outcome.V}</large></b>\n        </when>\n        <else>\n          Player to move: {toMove.V}\n        </else>\n      </case>\n    </p>\n    <button onclick=\"ClearAll()\">Clear</button>\n  </div>\n</div>";
declare const sampleRHTML = "<define rvar=sourcecode\n        value=\"1 + 1 = <b>\\{1+1\\}</b>\"\n></define>\n<textarea @value=\"sourcecode.V\" rows=3 cols=50></textarea>\n<br>\n<RHTML #srctext=sourcecode.V></RHTML>";
declare const sampleStyleTemplate = "<def rvar=Hue #value=\"0\"></def>\nCurrent hue is: {Hue.V.toFixed()}\n\n<RSTYLE>\n  h2 {\n    color: hsl( ${Hue}, 100%, 50%);\n  }\n</RSTYLE>\n\n<h2>Section head</h2>\nSection contents\n<h2>Another section head</h2>\n\nClick here:\n  <button onclick=\"Hue.V = Math.random() * 360\">Random hue</button>";
declare const C1 = "<!-- Component signature with parameter -->\n<Repeat #count>\n    <!-- Slot signature with parameter -->\n    <content #num></content>\n</Repeat>", C2 = "<!-- Component template -->\n<TEMPLATE #count=cnt>\n    <FOR let=i  of=\"range(1, cnt)\">\n        <!-- Slot instance -->\n        <content #num=\"i\"></content>\n    </FOR>\n</TEMPLATE>", C3 = "<!-- Component instance -->\n<Repeat #count=7>\n    <!-- Slot template -->\n    <content #num>\n        <p>This is <u>paragraph {num}</u>.</p>\n    </content>\n</Repeat>", C4 = "<!-- Component instance and slot instance in one -->\n<Repeat #count=7 #num>\n    <p>This is <u>paragraph {num}</u>.</p>\n</Repeat>", sampleComponent1: string;
declare const sampleFormatting = "<style>\n  dt {\n    font-weight: bold\n  }\n</style>\n\n<define var=today #value=\"new Date()\"></define>\n<dl>\n    <dt>Internationalization API</dt>\n    <script type=otoreact defines=dateFmt>\n        const dateFmt = \n            new Intl.DateTimeFormat('en', \n                {day:'numeric', month: 'short'});\n    </script>\n    <dd>\n        Today is {dateFmt.format(today)}.\n    </dd>\n\n    <dt>Day.js</dt>\n    <script async src=\"./dayjs.min.js\"></script>\n    <dd>\n        Today is {dayjs(today).format('MMM D')}.\n    </dd>\n\n    <dt>Standard Date methods</dt>\n    <dd>\n      Today is {today.toString().replace(/\\w+ (\\w+ \\w+) .*/, '$1')}.\n    </dd>\n</dl>";
declare const sampleDocument = "<def rvar=check #value=\"false\"></def>\n\n<document name=showCheck>\n    <h4>This is a separate document.</h4>\n    <label reacton=check style=\"display: block; margin: 30px\">\n        <input type=checkbox @checked=check.V> Check me!\n    </label>\n</document>\n\n<button onclick=\"\n    showCheck.open(''\n        ,`screenX=${window.screenX + event.clientX - 100},\n        screenY=${window.screenY + event.clientY + 200},\n        width=250,height=120`\n        )\"\n>Pop up</button>\n<p>\n<label reacton=check>\n    <input type=checkbox @checked=check.V> Checked.\n</label>\n<p>\n<button onclick=\"showCheck.print()\">Print</button>";
declare const sampleRadioGroup = "<component>\n  <!-- Radiogroup signature -->\n  <radiogroup name @value>\n    <content>\n      <radiobutton #value onclick? ...rest>\n        <content></content>\n      </radiobutton>\n    </content>\n  </radiogroup>\n\n  <!-- Radiogroup template -->\n  <template @value=groupValue>\n    <content>\n      <radiobutton #value onclick ...rest>\n        <label style.cursor=pointer>\n          <input type=radio #name=name #value=value\n            #checked=\"value == groupValue.V\"\n            onclick=\"groupValue.V = value; onclick()\" ...rest>\n          <content></content>\n        </label>\n      </radiobutton>\n    </content>\n  </template>\n</component>\n\n\n<def rvar=answer></def>\n<p>\n  What's your preferred web framework?\n</p>\n<!-- Radiogroup instance -->\n<radiogroup name=framework @value=answer.V>\n  <radiobutton value=jQuery >jQuery</radiobutton>\n  <radiobutton value=React  >React</radiobutton>\n  <radiobutton value=Angular>Angular</radiobutton>\n  <radiobutton value=OtoReact>OtoReact</radiobutton>\n</radiogroup>\n\n<p #if=\"answer.V\">\n  You answered <b>{answer.V}</b>.\n</p>";
declare const demoRendering = "<style>\n  h5 {\n    margin: 0px;\n    padding: 4px 0px;\n    border-top: solid 2px grey;\n  }\n  pre {\n    white-space: pre-wrap;\n    background-color: lightgrey;\n  }\n</style>\n\n<h5>RHTML source:</h5>\n<def rvar=source store=sessionStorage value=\n\"<def var=x value=A></def>\n<ul> <li> x = \\{x\\} </ul>\"\n></def>\n<textarea rows=5 cols=50 @value=source.V></textarea>\n\n<h5>Parsed HTML:</h5>\n<def rvar=ParsedHTML></def>\n<div hidden #innerhtml=source.V \n    *+innerhtml= \"ParsedHTML.V\"\n></div>\n<pre>{ParsedHTML.V}</pre>\n\n<h5>RHTML rendering:</h5>\n<def rvar=RenderedHTML></def>\n<rhtml #srctext=source.V\n  oncreateupdate= \"RenderedHTML.V = this.shadowRoot.innerHTML\"\n></rhtml>\n\n<h5>Rendered HTML:</h5>\n<pre>{RenderedHTML.V}</pre>";
declare const demoScoping = "(Look at the source code please)\n\n<define var=A #value=\"10\"></define>\n<define var=F #value=\"(x) => A+x\"></define>\n\n<p>\n    Now A = { A }, F(1) = { F(1) }\n</p>\n\n<p style=\"border: 1px solid; padding:1ex\">\n    <define var=A #value=20></define>\n    Here we have a new A = {A}, but F still refers to the orinal A, so F(2) = {F(2)}\n</p>\n\n<p>Here A = {A} again.</p>";
declare const basicSetup = "<!DOCTYPE html>\n<html>\n    <head>\n        <script type=module>\n            import {RCompile} from './OtoReact.js';\n            RCompile(document.body)\n        </script>\n    </head>\n    <body hidden>\n        <!-- Here goes your RHTML -->\n        <FOR let=i of=\"range(5)\">\n            <div>Hello world {i}</div>\n        </FOR>\n    </body>\n</html>";
declare const demoRadiogroup = "<import src=\"OtoLib.html\">\n  <radiogroup></radiogroup>\n</import>\n\n<p>What's your favorite color?</p>\n\n<def rvar=\"favColor\"></def>\n<radiogroup @value=\"favColor.V\">\n  <for let=\"C\" of=\"['Red', 'Lime', 'SkyBlue', 'Pink']\">\n    <radiobutton #value=\"C\">{C}</radiobutton>\n  </for>\n  <br>\n  <radiobutton value=\"None\">I don't have a favorite</radiobutton>\n</radiogroup>\n\n<case #value=\"favColor.V\">\n  <when match=\"None\">\n    <p>Oh, I'm sorry to hear that.</p>\n  </when>\n  <when match=\"{C}\"> <!-- This binds the case-value to 'C' -->\n    <p #style.backgroundcolor=\"C\">Yes, {C.toLowerCase()} is a great color.</p>\n  </when>\n</case>";
declare const demoCheckbox = "<import src=\"OtoLib.html\">\n  <checkbox></checkbox>\n</import>\n\n<def rvar=\"check\" #value=\"null\"></def>\n\n<checkbox @value=\"check.V\">Click me</checkbox>,\nor\n<button onclick=\"check.V = null\">Set to indeterminate</button>\n\n<p>The checkbox value is: <code>{ `${check.V}` }</code>";
declare const demoTables = "<style>\n  * {\n    text-align: center;\n  }\n\n  input {\n    text-align: right;\n    width: 8ex;\n  }\n\n  div.multi {\n      display: flex; flex-wrap: wrap;\n      gap: 2ex; \n      justify-content: center;\n      margin: 1ex;\n  }\n</style>\n\n<DEF rvar=maxY #value=6  store=sessionStorage></DEF>\n<DEF rvar=maxX #value=10 store=sessionStorage></DEF>\n\n<div class=multi>\n  <label>Number of tables:\n    <input type=number @valueAsNumber=maxY.V>\n  </label>\n  <label>Number of rows:\n    <input type=number @valueAsNumber=maxX.V>\n  </label>\n</div>\n\n<div class=multi>\n  <FOR let=y of=\"range(1,maxY.V)\">\n      <div>\n          <FOR let=x of=\"range(1,maxX.V)\">\n              <div>{x} x {y} = {x * y}</div>\n          </FOR>\n      </div>\n  </FOR>\n</div>";
declare const demoTwoWayRVAR = "\n<style>\n  input {\n    display: block;\n    width: 6em;\n    margin: 4px 0px;\n  }\n</style>\n\n<define rvar=\"data\" #value=\"[ ]\" store=\"sessionStorage\"></define>\n\nPlease enter some numbers:\n<for let=\"i\" of=\"range(5)\">\n  <DEFINE RVAR=\"num\" @VALUE=\"data.U[i]\"></DEFINE>\n\n  <input type=\"number\" @valueasnumber=\"num.V\">\n</for>\n\n<p reacton=\"data\">\n  The sum is {data.V.reduce((a,b)=>a+b,0)}\n</p>";
declare const demoAutoSubscribtion = "\n<p>\n\t<def rvar=a #value=0></def>\n\t<!-- Both these elements are auto-subscribed to a: -->\n\t<button onclick=\"a.V++\">{a}</button>\n\t<span>a = {a}</span>\n</p>\n\n<p>\n\t<def rvar=b #value=0></def>\n\t<!-- Here only the <span> reacts on b: -->\n\t<button onclick=\"b.V++\">{b}</button>\n\t<span reacton=b>b = {b}</span>\n</p>";
