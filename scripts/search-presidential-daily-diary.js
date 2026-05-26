#!/usr/bin/env node

const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "reports");
const DATA_DIR = path.join(ROOT, "data");
const DATA_PATH = path.join(DATA_DIR, "records.json");
const DATA_JS_PATH = path.join(DATA_DIR, "records.js");
const JSON_PATH = path.join(REPORT_DIR, "presidential-daily-diary-search.json");
const MD_PATH = path.join(REPORT_DIR, "presidential-daily-diary-search.md");

const USER_SEARCH_URL =
  "https://catalog.archives.gov/search?q=%222010-0083-F%22&collectionIdentifier=WJC*";
const API_BASE = "https://catalog.archives.gov/proxy/v3/records/search";

const SEARCH_TERMS = [
  "2010-0083-F",
  "NATO",
  "North Atlantic",
  "North Atlantic Council",
  "Russia",
  "Russian",
  "Yeltsin",
  "Putin",
  "Bosnia",
  "Kosovo",
  "Milosevic",
  "Havel",
  "Walesa",
  "Kwasniewski",
  "Solana",
  "Kozyrev",
  "Mamedov",
  "enlargement",
  "OSCE",
  "CSCE",
  "CFE",
  "Madrid",
  "Prague",
  "Brussels",
  "Istanbul",
  "Washington Summit",
  "Dayton",
  "KFOR"
];

const SELECTED_REFERENCES = [
  {
    date: "1993-03-24",
    naid: "147870749",
    sourcePages: "page 89",
    title: "Presidential Daily Diary reference: meeting with Russian Foreign Minister Andrey Kozyrev",
    summary:
      "The diary records a White House meeting with Russian Foreign Minister Andrey Kozyrev, joined by Gore, Christopher, Talbott, Lake, Gati, Lukin, and interpreters.",
    compilerUse:
      "Use as an early Clinton-era Russia/European security chronology anchor and to chase any substantive memcon.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Andrey Kozyrev", "Warren Christopher", "Strobe Talbott"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1993-09-29",
    naid: "147870769",
    sourcePages: "page 90",
    title: "Presidential Daily Diary reference: meeting with Russian Foreign Minister Andrey Kozyrev",
    summary:
      "The diary records an afternoon White House meeting with Russian Foreign Minister Andrey Kozyrev.",
    compilerUse:
      "Use to flag a likely source trail for Russia policy immediately before the October 1993 NATO contact.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Andrey Kozyrev"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1993-10-06",
    naid: "17368174",
    sourcePages: "page 5",
    title: "Presidential Daily Diary reference: meeting with NATO Secretary General Manfred Woerner",
    summary:
      "The diary records a late-morning Oval Office meeting with NATO Secretary General Manfred Woerner.",
    compilerUse:
      "High-priority NATO lead; chase memcon, briefing book, and NSC European Affairs prep/follow-up files.",
    topics: ["NATO Strategy", "NATO enlargement"],
    participants: ["Bill Clinton", "Manfred Woerner"],
    countries: ["United States"]
  },
  {
    date: "1994-01-03",
    naid: "147870783",
    sourcePages: "pages 18 and 21",
    title: "Presidential Daily Diary reference: NATO Summit preparation meetings",
    summary:
      "The diary records morning and afternoon meetings to prepare for the NATO Summit in Europe, including a Joint Chiefs of Staff session and an administration-policy session.",
    compilerUse:
      "Use to structure the January 1994 NATO summit lead-up and target NSC/JCS preparatory material.",
    topics: ["NATO Strategy", "NATO enlargement", "Partnership for Peace"],
    participants: ["Bill Clinton", "Strobe Talbott", "Anthony Lake", "Samuel Berger"],
    countries: ["United States"]
  },
  {
    date: "1994-01-14",
    naid: "147870783",
    sourcePages: "page 68",
    title: "Presidential Daily Diary reference: denuclearization signing with Yeltsin and Kravchuk",
    summary:
      "The diary records Clinton participating in the Moscow signing ceremony for denuclearization agreements with Boris Yeltsin and Leonid Kravchuk.",
    compilerUse:
      "Context for the Russia/Ukraine security architecture surrounding the January 1994 European trip.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Boris Yeltsin", "Leonid Kravchuk"],
    countries: ["United States", "Russia", "Ukraine"]
  },
  {
    date: "1994-02-19",
    naid: "147870789",
    sourcePages: "pages 53 and 58",
    title: "Presidential Daily Diary reference: Bosnia briefing with administration officials",
    summary:
      "The diary records a briefing on Bosnia and the radio address on the situation there; the appendix lists senior foreign-policy and defense participants.",
    compilerUse:
      "Use as a Bosnia/NATO crisis chronology lead; chase Situation Room, NSC, and public address drafts.",
    topics: ["Bosnia", "NATO Strategy"],
    participants: ["Bill Clinton", "Warren Christopher", "William Perry", "John Shalikashvili"],
    countries: ["United States", "Bosnia and Herzegovina"]
  },
  {
    date: "1994-02-20",
    naid: "147870789",
    sourcePages: "pages 62-63",
    title: "Presidential Daily Diary reference: Bosnia calls with Woerner and Mitterrand",
    summary:
      "The diary records a conference call with NATO Secretary General Manfred Woerner, a call with French President Francois Mitterrand, a senior-adviser discussion on Bosnia, and a later call with Woerner in Brussels.",
    compilerUse:
      "High-value lead for NATO action on Bosnia; chase telcons and NSC crisis-management files.",
    topics: ["Bosnia", "NATO Strategy"],
    participants: ["Bill Clinton", "Manfred Woerner", "Francois Mitterrand", "Anthony Lake"],
    countries: ["United States", "France", "Bosnia and Herzegovina"]
  },
  {
    date: "1994-02-21",
    naid: "147870789",
    sourcePages: "page 67",
    title: "Presidential Daily Diary reference: Bosnia and Sarajevo meeting and NATO-action statement",
    summary:
      "The diary records a meeting on Bosnia and Sarajevo and a statement on the results of NATO action.",
    compilerUse:
      "Use to align Bosnia/Sarajevo chronology with NATO air-power documents and public framing.",
    topics: ["Bosnia", "NATO Strategy"],
    participants: ["Bill Clinton"],
    countries: ["United States", "Bosnia and Herzegovina"]
  },
  {
    date: "1994-04-10",
    naid: "147870795",
    sourcePages: "pages 50 and 53",
    title: "Presidential Daily Diary reference: NATO bombing in Bosnia and Yeltsin conference call",
    summary:
      "The diary records a Situation Room meeting on the recent NATO bombing in Bosnia, a press statement, an attempted Yeltsin call, and a later conference call with Yeltsin.",
    compilerUse:
      "Use to connect Bosnia crisis management with Russia consultation; chase both briefing notes and telcon.",
    topics: ["Bosnia", "NATO-Russia", "NATO Strategy"],
    participants: ["Bill Clinton", "Boris Yeltsin"],
    countries: ["United States", "Russia", "Bosnia and Herzegovina"]
  },
  {
    date: "1994-12-05",
    naid: "147870813",
    sourcePages: "pages 42-44",
    title: "Presidential Daily Diary reference: CSCE Budapest Summit and meetings with Yeltsin, Kohl, Croatian and Bosnian officials",
    summary:
      "The diary records the CSCE Budapest Summit plenary, the START I instruments signing with Yeltsin and other leaders, and meetings including Yeltsin, Kohl, and Croatian and Bosnian officials.",
    compilerUse:
      "Use as an OSCE/CSCE and European security architecture anchor; chase summit memcons and delegation files.",
    topics: ["OSCE/CSCE", "NATO-Russia", "Bosnia", "European Security Architecture"],
    participants: ["Bill Clinton", "Boris Yeltsin", "Helmut Kohl"],
    countries: ["United States", "Russia", "Germany", "Bosnia and Herzegovina", "Croatia", "Hungary"]
  },
  {
    date: "1995-03-07",
    naid: "17368179",
    sourcePages: "pages 65 and 70",
    title: "Presidential Daily Diary reference: meeting with U.S. and NATO officials",
    summary:
      "The diary records a meeting with U.S. and NATO officials; the appendix lists Willy Claes, Robert Hunter, John Kornblum, Sandy Vershbow, and NATO staff.",
    compilerUse:
      "High-priority NATO institutional lead; chase memcon and briefing materials around Claes visit.",
    topics: ["NATO Strategy", "NATO enlargement"],
    participants: ["Bill Clinton", "Willy Claes", "Robert Hunter", "Sandy Vershbow"],
    countries: ["United States"]
  },
  {
    date: "1995-05-10",
    naid: "147870833",
    sourcePages: "pages 67-73",
    title: "Presidential Daily Diary reference: Moscow meetings and luncheon with Yeltsin",
    summary:
      "The diary records Clinton's Moscow briefing, Kremlin meetings with Yeltsin, and a private luncheon hosted by Yeltsin.",
    compilerUse:
      "Use for NATO-Russia and broader European security context; chase the Moscow summit memoranda.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Boris Yeltsin", "Strobe Talbott", "Anthony Lake"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1995-07-28",
    naid: "147870839",
    sourcePages: "page 50",
    title: "Presidential Daily Diary reference: conference call with Boris Yeltsin",
    summary:
      "The diary records a morning conference call with Boris Yeltsin and NSC/Situation Room participants.",
    compilerUse:
      "Use as a Russian consultation lead; chase telcon text for NATO/Bosnia relevance before inclusion.",
    topics: ["NATO-Russia", "Bosnia"],
    participants: ["Bill Clinton", "Boris Yeltsin"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1995-11-20",
    naid: "147870847",
    sourcePages: "pages 38-40",
    title: "Presidential Daily Diary reference: Dayton calls with Christopher and Tudjman",
    summary:
      "The diary records calls with Secretary Christopher in Dayton and a conference call with Croatian President Franjo Tudjman.",
    compilerUse:
      "Use to anchor the Dayton peace negotiation endgame and chase telcon/source packets.",
    topics: ["Bosnia", "Dayton"],
    participants: ["Bill Clinton", "Warren Christopher", "Franjo Tudjman"],
    countries: ["United States", "Croatia", "Bosnia and Herzegovina"]
  },
  {
    date: "1995-11-21",
    naid: "147870847",
    sourcePages: "pages 41-42",
    title: "Presidential Daily Diary reference: Dayton conference call with Tudjman, Izetbegovic, Milosevic, and Christopher",
    summary:
      "The diary records a conference call with Franjo Tudjman, Alija Izetbegovic, Slobodan Milosevic, and Secretary Christopher, followed by calls with Lech Walesa and Aleksander Kwasniewski.",
    compilerUse:
      "High-value Bosnia/Dayton and Central Europe lead; chase complete telcon records.",
    topics: ["Bosnia", "Dayton", "NATO enlargement"],
    participants: [
      "Bill Clinton",
      "Franjo Tudjman",
      "Alija Izetbegovic",
      "Slobodan Milosevic",
      "Warren Christopher",
      "Lech Walesa",
      "Aleksander Kwasniewski"
    ],
    countries: ["United States", "Croatia", "Bosnia and Herzegovina", "Serbia", "Poland"]
  },
  {
    date: "1996-01-12",
    naid: "147870851",
    sourcePages: "page 21",
    title: "Presidential Daily Diary reference: secure voice call with NATO Secretary General Javier Solana",
    summary:
      "The diary records a secure voice call with NATO Secretary General Javier Solana.",
    compilerUse:
      "Use as a NATO/IFOR-era telcon lead; chase conversation text before selecting.",
    topics: ["NATO Strategy", "Bosnia"],
    participants: ["Bill Clinton", "Javier Solana"],
    countries: ["United States"]
  },
  {
    date: "1996-01-13",
    naid: "147870851",
    sourcePages: "page 22",
    title: "Presidential Daily Diary reference: call with Slobodan Milosevic",
    summary:
      "The diary records a call with Serbian President Slobodan Milosevic aboard Air Force One.",
    compilerUse:
      "Use as a Bosnia/Dayton implementation lead; chase telcon text.",
    topics: ["Bosnia", "Dayton"],
    participants: ["Bill Clinton", "Slobodan Milosevic"],
    countries: ["United States", "Serbia", "Bosnia and Herzegovina"]
  },
  {
    date: "1996-02-23",
    naid: "147870853",
    sourcePages: "page 36",
    title: "Presidential Daily Diary reference: conference call with Boris Yeltsin",
    summary:
      "The diary records an attempted Yeltsin call followed by a completed conference call with Yeltsin and NSC/Situation Room participants.",
    compilerUse:
      "Use as a NATO-Russia consultation lead; verify substantive topic in telcon text.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Boris Yeltsin"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1997-07-03",
    naid: "147870887",
    sourcePages: "page 8",
    title: "Presidential Daily Diary reference: pre-Madrid conference call with Helmut Kohl",
    summary:
      "The diary records a conference call with German Chancellor Helmut Kohl days before the Madrid NATO Summit.",
    compilerUse:
      "Use as a Madrid/NATO-enlargement chronology lead; formal Madrid summit sessions remain a release gap in this diary pass.",
    topics: ["NATO enlargement", "NATO Strategy"],
    participants: ["Bill Clinton", "Helmut Kohl"],
    countries: ["United States", "Germany", "Spain"]
  },
  {
    date: "1998-03-25",
    naid: "147870909",
    sourcePages: "pages 52-53",
    title: "Presidential Daily Diary reference: NATO enlargement ratification briefing and remarks",
    summary:
      "The diary records a briefing on the Senate's upcoming NATO enlargement ratification vote and remarks on enlargement.",
    compilerUse:
      "Use to align Senate-ratification records, public papers, and NSC congressional strategy files.",
    topics: ["NATO enlargement"],
    participants: ["Bill Clinton", "Madeleine Albright", "Henry Shelton", "Samuel Berger"],
    countries: ["United States", "Poland", "Czech Republic", "Hungary"]
  },
  {
    date: "1998-04-30",
    naid: "147870913",
    sourcePages: "page 81",
    title: "Presidential Daily Diary reference: bipartisan support meeting for NATO enlargement",
    summary:
      "The diary records a meeting on bipartisan support for NATO enlargement with Gore, Lott, Daschle, Bowles, Berger, Podesta, and others.",
    compilerUse:
      "Use to fill the domestic strategy side of NATO enlargement ratification.",
    topics: ["NATO enlargement"],
    participants: ["Bill Clinton", "Al Gore", "Trent Lott", "Thomas Daschle", "Samuel Berger"],
    countries: ["United States", "Poland", "Czech Republic", "Hungary"]
  },
  {
    date: "1998-05-08",
    naid: "147870915",
    sourcePages: "pages 11 and 13",
    title: "Presidential Daily Diary reference: calls with Javier Solana and Vaclav Havel",
    summary:
      "The diary records a conference call with NATO Secretary General Javier Solana and a later call with Czech President Vaclav Havel.",
    compilerUse:
      "Use as a NATO enlargement/accession lead; chase telcon records.",
    topics: ["NATO enlargement", "NATO Strategy"],
    participants: ["Bill Clinton", "Javier Solana", "Vaclav Havel"],
    countries: ["United States", "Czech Republic"]
  },
  {
    date: "1998-05-12",
    naid: "17368188",
    sourcePages: "pages 12-13",
    title: "Presidential Daily Diary reference: NATO accession ratification ceremony",
    summary:
      "The diary records a briefing and ceremony to sign the instruments of ratification for Poland, Hungary, and the Czech Republic to join NATO.",
    compilerUse:
      "Use as the public/action chronology for accession ratification; pair with treaty, Senate, and NSC records.",
    topics: ["NATO enlargement"],
    participants: ["Bill Clinton", "Madeleine Albright", "William Cohen", "Joseph Ralston"],
    countries: ["United States", "Poland", "Czech Republic", "Hungary"]
  },
  {
    date: "1998-05-29",
    naid: "147870917",
    sourcePages: "pages 54-55",
    title: "Presidential Daily Diary reference: Kosovo meeting with Ibrahim Rugova and Dayton implementation briefing",
    summary:
      "The diary records a meeting/briefing touching Dayton implementation, followed by a photo opportunity with Ibrahim Rugova and Kosovo Albanian leaders.",
    compilerUse:
      "Use as a Kosovo escalation lead; chase NSC Balkans files and any Rugova memcon.",
    topics: ["Kosovo", "Bosnia", "Dayton"],
    participants: ["Bill Clinton", "Ibrahim Rugova", "Al Gore", "Samuel Berger", "Robert Gelbard"],
    countries: ["United States", "Kosovo", "Bosnia and Herzegovina"]
  },
  {
    date: "1998-06-15",
    naid: "147870919",
    sourcePages: "pages 101-103",
    title: "Presidential Daily Diary reference: meeting and conference call with Boris Yeltsin",
    summary:
      "The diary records a meeting with Talbott, Berger, and others overlapping a conference call with Boris Yeltsin.",
    compilerUse:
      "Use as a NATO-Russia consultation lead; chase telcon and preparatory notes.",
    topics: ["NATO-Russia", "Bosnia"],
    participants: ["Bill Clinton", "Boris Yeltsin", "Strobe Talbott", "Samuel Berger"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1998-09-02",
    naid: "17368189",
    sourcePages: "pages 57-58",
    title: "Presidential Daily Diary reference: Moscow meeting with Yeltsin and common-security signing",
    summary:
      "The diary records a Kremlin meeting with Yeltsin, a signing ceremony for documents on common security at the threshold of the 21st century, and a joint news conference.",
    compilerUse:
      "Use as a high-priority NATO-Russia/common security lead; chase summit memoranda and signed-document files.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Boris Yeltsin", "Madeleine Albright", "Strobe Talbott"],
    countries: ["United States", "Russia"]
  },
  {
    date: "1998-09-18",
    naid: "17368189",
    sourcePages: "page 80",
    title: "Presidential Daily Diary reference: Kosovo meeting with Robert Dole",
    summary:
      "The diary records an Oval Office meeting to discuss Kosovo with former Senator Robert Dole, Sandy Berger, and others.",
    compilerUse:
      "Use as a Kosovo diplomacy lead; chase memcon, Berger files, and congressional-contact files.",
    topics: ["Kosovo"],
    participants: ["Bill Clinton", "Robert Dole", "Madeleine Albright", "Samuel Berger"],
    countries: ["United States", "Kosovo"]
  },
  {
    date: "1999-03-23",
    naid: "147870957",
    sourcePages: "pages 26 and 33",
    title: "Presidential Daily Diary reference: Kosovo briefings and congressional meeting",
    summary:
      "The diary records a Kosovo-era briefing and a meeting with members of Congress; the appendix lists Albright, Cohen, Tenet, Shelton, and congressional leaders.",
    compilerUse:
      "Use as the pre-strike congressional and policy-briefing chronology.",
    topics: ["Kosovo", "NATO Strategy"],
    participants: ["Bill Clinton", "Madeleine Albright", "William Cohen", "George Tenet", "Henry Shelton"],
    countries: ["United States", "Kosovo", "Serbia"]
  },
  {
    date: "1999-03-24",
    naid: "147870957",
    sourcePages: "pages 37-38",
    title: "Presidential Daily Diary reference: Kosovo air-strike briefing and statement",
    summary:
      "The diary records a call with Canadian Prime Minister Jean Chretien, a briefing on the air strikes against Serbian military targets, and a statement to the press.",
    compilerUse:
      "Use as the start-of-air-campaign chronology; chase allied calls and speech/NSC drafts.",
    topics: ["Kosovo", "NATO Strategy"],
    participants: ["Bill Clinton", "Jean Chretien", "Samuel Berger", "James Steinberg"],
    countries: ["United States", "Canada", "Serbia", "Kosovo"]
  },
  {
    date: "1999-04-06",
    naid: "17368193",
    sourcePages: "page 4",
    title: "Presidential Daily Diary reference: Kosovo and Balkans briefing",
    summary:
      "The diary records a morning briefing on Kosovo and the Balkans with Secretary Cohen and senior White House officials.",
    compilerUse:
      "Use as a Kosovo campaign chronology lead; chase Defense/NSC briefing papers.",
    topics: ["Kosovo", "Bosnia", "NATO Strategy"],
    participants: ["Bill Clinton", "William Cohen", "John Podesta", "Samuel Berger"],
    countries: ["United States", "Kosovo", "Serbia"]
  },
  {
    date: "1999-04-22",
    naid: "147870961",
    sourcePages: "pages 35-36",
    title: "Presidential Daily Diary reference: meeting with NATO Secretary General Javier Solana",
    summary:
      "The diary records a meeting with NATO Secretary General Javier Solana, a NATO Summit press statement, and a follow-on meeting with Solana and Berger.",
    compilerUse:
      "Use as a Washington NATO Summit and Kosovo campaign lead; chase Solana memcon.",
    topics: ["NATO Strategy", "Kosovo"],
    participants: ["Bill Clinton", "Javier Solana", "Samuel Berger"],
    countries: ["United States"]
  },
  {
    date: "1999-04-23",
    naid: "147870961",
    sourcePages: "pages 40-49",
    title: "Presidential Daily Diary reference: NATO 50th Anniversary Summit weekend",
    summary:
      "The diary records the NATO 50th Anniversary Summit, a Chirac meeting, the NATO dinner, North Atlantic Council sessions, the NATO-Ukraine Commission, and an attempted Yeltsin call during the summit weekend.",
    compilerUse:
      "High-priority summit chronology; chase summit memcons, NAC files, public papers, and allied telcons.",
    topics: ["NATO Strategy", "NATO enlargement", "NATO-Russia", "Kosovo"],
    participants: ["Bill Clinton", "Jacques Chirac", "Javier Solana", "Boris Yeltsin", "Strobe Talbott"],
    countries: ["United States", "France", "Russia", "Ukraine"]
  },
  {
    date: "1999-05-05",
    naid: "147870963",
    sourcePages: "pages 19-24",
    title: "Presidential Daily Diary reference: NATO Headquarters visit and allied forces briefing",
    summary:
      "The diary records arrival at NATO Headquarters, greeting by Solana, a meeting with U.S. and NATO officials, an allied forces briefing, and the appendix listing Vershbow, Blinken, Solana, and NATO staff.",
    compilerUse:
      "Use as a NATO Headquarters/Kosovo campaign lead; chase NATO and NSC European Affairs files.",
    topics: ["NATO Strategy", "Kosovo"],
    participants: ["Bill Clinton", "Javier Solana", "Sandy Vershbow", "Antony Blinken", "Madeleine Albright", "William Cohen"],
    countries: ["United States", "Belgium"]
  },
  {
    date: "1999-06-10",
    naid: "17368193",
    sourcePages: "pages 59-61",
    title: "Presidential Daily Diary reference: Kosovo Military Technical Agreement calls",
    summary:
      "The diary records calls with Wesley Clark, Javier Solana, Boris Yeltsin, Jacques Chirac, Massimo D'Alema, Jose Maria Aznar, and Jean Chretien around the Kosovo Military Technical Agreement.",
    compilerUse:
      "High-priority Kosovo settlement lead; chase complete telcons and NATO/SACEUR traffic.",
    topics: ["Kosovo", "NATO-Russia", "NATO Strategy"],
    participants: ["Bill Clinton", "Wesley Clark", "Javier Solana", "Boris Yeltsin", "Jacques Chirac", "Massimo D'Alema", "Jose Maria Aznar", "Jean Chretien"],
    countries: ["United States", "Russia", "France", "Italy", "Spain", "Canada", "Kosovo", "Serbia"]
  },
  {
    date: "1999-11-18",
    naid: "17368195",
    sourcePages: "pages 51-59",
    title: "Presidential Daily Diary reference: OSCE Istanbul Summit and bilateral meeting with Yeltsin",
    summary:
      "The diary records the OSCE Istanbul Summit program and a bilateral meeting with Boris Yeltsin; the appendix lists the U.S. and Russian participants.",
    compilerUse:
      "Use as an OSCE/CFE/NATO-Russia architecture lead; chase summit memcons and Istanbul files.",
    topics: ["OSCE/CSCE", "NATO-Russia", "CFE"],
    participants: ["Bill Clinton", "Boris Yeltsin", "Madeleine Albright", "James Steinberg", "Antony Blinken"],
    countries: ["United States", "Russia", "Turkey"]
  },
  {
    date: "1999-11-19",
    naid: "147870987",
    sourcePages: "pages 72 and 79",
    title: "Presidential Daily Diary reference: CFE Treaty signing at Istanbul",
    summary:
      "The diary records Clinton's participation in the Conventional Armed Forces in Europe Treaty signing and lists attendees in the appendix.",
    compilerUse:
      "Use as a CFE architecture anchor; chase treaty-signing files, OSCE Summit records, and source-note classification details.",
    topics: ["CFE", "OSCE/CSCE", "European Security Architecture"],
    participants: ["Bill Clinton", "Madeleine Albright"],
    countries: ["United States", "Turkey"]
  },
  {
    date: "1999-11-23",
    naid: "147870989",
    sourcePages: "pages 37-43",
    title: "Presidential Daily Diary reference: Kosovo visit, NATO officials, and Kosovar leaders",
    summary:
      "The diary records meetings at Pristina with U.S. and NATO officials, Kosovar leaders, and Camp Bondsteel personnel; appendices identify KFOR and UN Kosovo participants.",
    compilerUse:
      "Use as a post-conflict Kosovo/KFOR chronology lead; chase KFOR, UNMIK, and NSC trip files.",
    topics: ["Kosovo", "KFOR", "NATO Strategy"],
    participants: ["Bill Clinton", "Madeleine Albright", "Bernard Kouchner", "Klaus Reinhardt", "Wesley Clark"],
    countries: ["United States", "Kosovo"]
  },
  {
    date: "2000-06-03",
    naid: "147871021",
    sourcePages: "pages 22-35",
    title: "Presidential Daily Diary reference: Moscow meetings and dinner with Vladimir Putin",
    summary:
      "The diary records Clinton's Moscow arrival, dinner with Vladimir Putin, the June 4 Putin meeting, expanded U.S.-Russian sessions, a Kremlin walk, and a joint news conference.",
    compilerUse:
      "Use as late-volume NATO-Russia and strategic-stability context; chase Moscow summit memoranda.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Vladimir Putin", "Strobe Talbott", "Madeleine Albright", "Samuel Berger", "Igor Ivanov", "Georgy Mamedov"],
    countries: ["United States", "Russia"]
  },
  {
    date: "2000-07-21",
    naid: "17368201",
    sourcePages: "pages 12 and 16",
    title: "Presidential Daily Diary reference: Okinawa G-8 meeting with Vladimir Putin",
    summary:
      "The diary records Clinton greeting Putin and meeting with him at Okinawa, with a foreign-policy briefing appendix listing Russia/Eurasia staff.",
    compilerUse:
      "Use as late-volume Putin/NATO-Russia context; chase Okinawa summit memcons.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Vladimir Putin", "Strobe Talbott", "James Steinberg", "Mark Medish"],
    countries: ["United States", "Russia", "Japan"]
  },
  {
    date: "2000-09-06",
    naid: "17368201",
    sourcePages: "pages 31-32",
    title: "Presidential Daily Diary reference: United Nations meeting with Putin and strategic stability signing",
    summary:
      "The diary records a Waldorf Astoria meeting with Putin and a signing ceremony for the U.S.-Russia Strategic Stability Cooperation Initiative.",
    compilerUse:
      "Use as late-volume strategic-stability context and as a lead to UN Millennium Summit files.",
    topics: ["NATO-Russia", "European Security Architecture"],
    participants: ["Bill Clinton", "Vladimir Putin", "Strobe Talbott"],
    countries: ["United States", "Russia"]
  }
];

const GAPS = [
  {
    severity: "High",
    label: "Diary is chronology, not substance",
    detail:
      "Most entries identify the time, participants, and sometimes a general purpose; the compiler still needs memcons, telcons, briefing books, and source-image verification before selection."
  },
  {
    severity: "High",
    label: "Madrid summit release gap",
    detail:
      "The July 1997 Madrid date-range PDF records a useful July 3 Kohl call, but the released July 8-10 diary pages are thin and do not capture formal NATO summit sessions."
  },
  {
    severity: "High",
    label: "Helsinki summit release gap",
    detail:
      "The March 1997 Helsinki date-range PDF surfaced only late-day diary fragments, not the substantive Clinton-Yeltsin summit schedule; use trip files and memcons instead."
  },
  {
    severity: "Medium",
    label: "Partial releases and OCR noise",
    detail:
      "The PDD packets include withdrawal/redaction sheets, partial pages, occasional OCR errors, and some malformed dates; check the page images/PDF before final citation."
  },
  {
    severity: "Medium",
    label: "Term search limitations",
    detail:
      "NARA full-text hits vary by release and OCR vocabulary, so the report records the terms used and preserves NAIDs for re-querying additional names or summit labels."
  }
];

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Unable to parse JSON from ${url}: ${body.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

function searchUrlFor(term) {
  const q = term === "2010-0083-F" ? "\"2010-0083-F\"" : `"Presidential Daily Diary" "${term}"`;
  return `${API_BASE}?q=${encodeURIComponent(q)}&collectionIdentifier=WJC*&limit=100&page=1`;
}

function pdfObject(record) {
  return (record.digitalObjects || []).find((object) => /PDF/i.test(object.objectType || "")) || {};
}

function variant(record) {
  return (record.variantControlNumbers || []).map((item) => item.number).find(Boolean) || "";
}

function recordSummary(hit, terms) {
  const record = hit._source?.record || {};
  const pdf = pdfObject(record);
  return {
    naid: String(record.naId || hit._id || ""),
    title: record.title || "",
    release: variant(record),
    catalogUrl: `https://catalog.archives.gov/id/${record.naId || hit._id}`,
    pdfUrl: pdf.objectUrl || "",
    pdfFilename: pdf.objectFilename || "",
    digitalObjects: (record.digitalObjects || []).length,
    terms: [...terms].sort()
  };
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function withCatalogData(reference, catalogRecords) {
  const catalog = catalogRecords.get(reference.naid) || {};
  const release = catalog.release || reference.release || "LPWJC 2013-0549-F";
  return {
    ...reference,
    release,
    catalogTitle: catalog.title || reference.catalogTitle || "",
    catalogUrl: catalog.catalogUrl || `https://catalog.archives.gov/id/${reference.naid}`,
    pdfUrl: catalog.pdfUrl || reference.pdfUrl || "",
    pdfFilename: catalog.pdfFilename || reference.pdfFilename || "",
    digitalObjects: catalog.digitalObjects || null,
    searchTermsHit: catalog.terms || []
  };
}

function mdTableRow(reference) {
  return [
    reference.date,
    `[${reference.naid}](${reference.catalogUrl})`,
    reference.sourcePages,
    reference.title.replace(/^Presidential Daily Diary reference:\s*/, ""),
    reference.compilerUse
  ].join(" | ");
}

function buildMarkdown(report) {
  return [
    "# Presidential Daily Diary Search",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Search Scope",
    "",
    `- User-supplied catalog search: ${USER_SEARCH_URL}`,
    `- Catalog proxy searched: ${API_BASE}`,
    `- Search terms: ${SEARCH_TERMS.map((term) => `\`${term}\``).join(", ")}`,
    `- Catalog records returned across term searches: ${report.counts.uniqueCatalogRecords}`,
    `- Selected diary references added as context records: ${report.counts.selectedReferences}`,
    "",
    "## Method",
    "",
    report.method,
    "",
    "## Selected Calls And Meetings",
    "",
    "Date | NAID | Source pages | Diary reference | Compiler use",
    "--- | --- | --- | --- | ---",
    ...report.selectedReferences.map(mdTableRow),
    "",
    "## Gaps",
    "",
    ...report.gaps.map((gap) => `- **${gap.severity}: ${gap.label}.** ${gap.detail}`),
    "",
    "## Source Note Rule",
    "",
    "PDD records are context citations. Keep the first footnote to repository, collection, release, date-range/file title, NAID, and source page. Put compiler warnings in review notes, not in the Source sentence.",
    ""
  ].join("\n");
}

function chapterFor(reference) {
  const text = [reference.title, reference.summary, reference.compilerUse, ...(reference.topics || [])].join(" ");
  if (/\b(Bosnia|Dayton|Kosovo|KFOR|Milosevic|Serbia|Balkans)\b/i.test(text)) {
    return { number: 4, name: "Crisis Security Files" };
  }
  if (/\b(NATO-Russia|Yeltsin|Putin|Russia|Russian|common security)\b/i.test(text)) {
    return { number: 2, name: "NATO-Russia and Partnership" };
  }
  if (/\b(OSCE|CSCE|CFE|European Security|strategic stability)\b/i.test(text)) {
    return { number: 3, name: "European Security Architecture" };
  }
  return { number: 1, name: "NATO Strategy and Enlargement" };
}

function pddRecord(reference) {
  const naid = String(reference.naid || "");
  const date = reference.date || "1993-01-01";
  const chapter = chapterFor(reference);
  const topics = unique(reference.topics || []);
  const countries = unique(["United States", ...(reference.countries || [])]);
  const participants = unique(["Bill Clinton", ...(reference.participants || [])]);
  const sourceNote = [
    "Source: National Archives and Records Administration, National Archives Catalog",
    "Clinton Presidential Records, Presidential Daily Diary, Ellen McCathran Files",
    reference.release ? `Release ${reference.release}` : "",
    reference.catalogTitle || reference.title || "",
    naid ? `NAID ${naid}` : "",
    "Unclassified diary record",
    reference.sourcePages ? `Source pages: ${reference.sourcePages}` : ""
  ]
    .filter(Boolean)
    .join(", ")
    .replace(", Source pages:", ". Source pages:")
    .concat(".");

  return {
    id: `pdd-${naid}-${date.replaceAll("-", "")}`,
    date,
    sortDate: date,
    type: "Context",
    title: reference.title,
    documentTitle: reference.title,
    participants,
    countries,
    chapter,
    releaseStatus: "Catalog Context",
    selectionDecision: "Context candidate",
    naid,
    catalogUrl: reference.catalogUrl || `https://catalog.archives.gov/id/${naid}`,
    pdfUrl: reference.pdfUrl || "",
    pageCount: null,
    digitalObjects: reference.digitalObjects || null,
    dateLine: date,
    washingtonTime: "",
    placementNote: "Diary chronology; verify final placement against substantive memcon, telcon, briefing, or trip records.",
    subjectLine: reference.summary,
    sourceNote,
    sourceNoteStatus: "Draft",
    sourceNoteAddendum:
      "Presidential Daily Diary context record; use for chronology and to identify likely memcon, telcon, briefing, trip, or summit files rather than as a substitute for the substantive conversation text.",
    sourcePages: reference.sourcePages || "",
    originalClassification: "Unclassified diary record",
    documentMarkings: [],
    handlingMarkings: [],
    distribution: "",
    draftingInfo: "",
    clearance: {},
    communication: {},
    readBy: [],
    declassificationStatus: "Released with excisions",
    withheldMaterial: {
      status: "Partial release",
      note: "PDD packet includes withdrawal/redaction sheets or partial diary pages; verify against the source PDF."
    },
    annotationStatus: "Pending",
    annotation: { firstFootnote: "", relatedDocuments: [], publicStatements: [], memoirs: [] },
    extractionStatus: "Diary OCR reviewed",
    source: {
      name: "National Archives and Records Administration, National Archives Catalog",
      url: reference.catalogUrl || `https://catalog.archives.gov/id/${naid}`,
      pdfUrl: reference.pdfUrl || "",
      collection: "Clinton Presidential Records, Presidential Daily Diary",
      series: "Ellen McCathran Files",
      caseNumber: reference.release || "",
      documentId: naid,
      path: unique([
        "Clinton Presidential Records",
        "Presidential Daily Diary",
        "Ellen McCathran Files",
        reference.release || "",
        reference.catalogTitle || "",
        naid ? `NAID ${naid}` : "",
        reference.sourcePages || ""
      ])
    },
    frusVolume: {
      id: "frus1993-00v17",
      title:
        "Foreign Relations of the United States, 1993-2000, Volume XVII, North Atlantic Treaty Organization; European Security",
      url: "https://history.state.gov/historicaldocuments/frus1993-00v17",
      status: "Planned"
    },
    frusTopics: topics,
    topics,
    indexTerms: unique([...topics, ...countries.filter((country) => country !== "United States")]),
    persons: participants,
    compilerNotes: unique([reference.compilerUse, reference.summary].filter(Boolean)),
    relatedReleaseIds: unique([reference.release, naid].filter(Boolean))
  };
}

function updateRecords(selectedReferences) {
  if (!fs.existsSync(DATA_PATH)) return { updated: false, totalRecords: 0, added: 0 };
  const existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const baseRecords = existing.filter((record) => !String(record.id || "").startsWith("pdd-"));
  const records = [...baseRecords, ...selectedReferences.map(pddRecord)];
  records.sort(
    (a, b) =>
      a.chapter.number - b.chapter.number ||
      (a.sortDate || a.date).localeCompare(b.sortDate || b.date) ||
      a.title.localeCompare(b.title)
  );
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(DATA_JS_PATH, `window.COMPILER_RECORDS = ${JSON.stringify(records, null, 2)};\n`);
  return { updated: true, totalRecords: records.length, added: selectedReferences.length };
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const termTotals = {};
  const catalogTerms = new Map();
  const catalogHits = new Map();

  for (const term of SEARCH_TERMS) {
    const url = searchUrlFor(term);
    const data = await requestJson(url);
    const hits = data.body?.hits?.hits || [];
    termTotals[term] = {
      total: data.body?.hits?.total?.value || hits.length,
      returned: hits.length,
      apiUrl: url
    };
    for (const hit of hits) {
      const id = String(hit._source?.record?.naId || hit._id || "");
      if (!id) continue;
      if (!catalogTerms.has(id)) catalogTerms.set(id, new Set());
      catalogTerms.get(id).add(term);
      catalogHits.set(id, hit);
    }
  }

  const catalogRecords = new Map(
    [...catalogHits.entries()].map(([id, hit]) => [id, recordSummary(hit, catalogTerms.get(id) || new Set())])
  );
  const selectedReferences = SELECTED_REFERENCES.map((reference) => withCatalogData(reference, catalogRecords));

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "National Archives and Records Administration, National Archives Catalog",
      userSearchUrl: USER_SEARCH_URL,
      apiBase: API_BASE
    },
    method:
      "NARA Catalog proxy searches were run against the user-supplied 2010-0083-F release and broader Presidential Daily Diary term searches. PDF OCR text was reviewed with pdftotext -layout, and only high-confidence calls, meetings, summit sessions, and briefing entries relevant to FRUS Volume XVII were promoted as context records.",
    searchTerms: SEARCH_TERMS,
    termTotals,
    counts: {
      uniqueCatalogRecords: catalogRecords.size,
      selectedReferences: selectedReferences.length,
      selectedReferencesByRelease: selectedReferences.reduce((counts, reference) => {
        counts[reference.release] = (counts[reference.release] || 0) + 1;
        return counts;
      }, {})
    },
    selectedReferences,
    gaps: GAPS,
    catalogRecordSample: [...catalogRecords.values()]
      .sort((a, b) => a.naid.localeCompare(b.naid))
      .slice(0, 50)
  };

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, `${buildMarkdown(report)}\n`);
  const recordUpdate = updateRecords(selectedReferences);

  console.log(`Wrote ${path.relative(ROOT, JSON_PATH)} and ${path.relative(ROOT, MD_PATH)}.`);
  if (recordUpdate.updated) {
    console.log(
      `Updated ${path.relative(ROOT, DATA_PATH)} and ${path.relative(ROOT, DATA_JS_PATH)} with ${recordUpdate.added} PDD context records.`
    );
  }
  console.log(JSON.stringify(report.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
