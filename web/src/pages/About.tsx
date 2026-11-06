import { LinkKey } from "../components/LinkKey";
import { useApp, useT } from "../lib/app";
import { CONTACT_EMAIL } from "../lib/site";

export function AboutPage() {
  const { corpus } = useApp();
  const t = useT();
  return (
    <div className="prose">
      <header className="section-head"><h1>{t("About this project", "இத்திட்டம் பற்றி")}</h1></header>
      <h2>{t("The name", "பெயர்")}</h2>
      <p>{t("மணிச்சிலம்பு, Maṇichchilambu, is the gem anklet. Kannagi's case is settled by what's inside her anklet: gems, not the queen's pearls (மணியுடை அரியே, SIL-20-0078). மணி also opens the name of the second epic, Maṇimēkalai. One word for both poems, and for a story where what looked the same on the outside was settled by what was inside.", "மணிச்சிலம்பு என்பது மணி உள்ள சிலம்பு. கண்ணகியின் வழக்கு அவள் சிலம்பின் உள்ளே இருந்த மணியால் தீர்ந்தது; அரசியின் சிலம்பில் முத்து (மணியுடை அரியே, SIL-20-0078). மணி என்பதே இரண்டாம் காப்பியமான மணிமேகலையின் பெயரையும் தொடங்குகிறது. இரு நூல்களுக்கும் ஒரே சொல்; வெளியே ஒன்றுபோல் தோன்றியதை உள்ளே இருந்தது தீர்த்த கதை.")}</p>
      <h2>{t("How to read the graph", "வரைபடத்தைப் படிப்பது எப்படி")}</h2>
      <p>{t("Nothing here is stored as simply true. Every record says that someone in the text tells us something, in some mood, at some point in the story. Only what's told as fact can change who holds what or who is alive. A claim can sit in the graph forever and never become a fact.", "இங்கு எதுவும் நேரடி உண்மையாகச் சேமிக்கப்படுவதில்லை. நூலில் யாரோ ஒருவர் ஏதோ ஒன்றைக் கூறுகிறார் என்பதையே ஒவ்வொரு பதிவும் கூறுகிறது. நிகழ்ந்ததாகக் கூறப்பட்டவை மட்டுமே கதையின் நிலையை மாற்றும்.")}</p>
      <h2>{t("How paths are kept honest", "தொடர்புகள் எப்படி நேர்மையாக இருக்கின்றன")}</h2>
      <p>{t("Every step of a path carries one of seven labels for what kind of link it is, listed below. A path can't conclude more than its weakest step, so two mentions of mango stay two mentions of mango. Only an explicit record can say someone made something. Examining an anklet won't.", "ஒவ்வொரு படிக்கும் அதன் வகை உண்டு: நிகழ்ந்தது, கூற்று, அதே நபர், அதே இடம், ஒரே வகை. பாதை தன் பலவீனமான படியை விட மேலாக முடிவு கூற முடியாது. வெளிப்படையான பதிவே ஒருவர் செய்ததாகக் கூறும்.")}</p>
      <LinkKey />
      <h2>{t("Three measures of depth", "ஆழத்தின் மூன்று அளவுகள்")}</h2>
      <p>{t("A 'longest path' through everything would just wander through hubs, and it's NP-hard in general anyway. So depth is reported three ways: reasoning steps needed for an answer, the longest chain in the event order, and how far a valid path runs across both epics. These numbers describe the records so far, and they'll change as more are added.", "எல்லாவற்றின் வழியாகச் செல்லும் நீண்ட பாதை பொருளற்றது. எனவே மூன்று அளவுகள்: விடைக்குத் தேவையான படிகள், நிகழ்ச்சி வரிசையின் நீளம், இரு நூல்களையும் கடக்கும் பாதை.")}</p>
      <h2>{t("How far to trust it", "எவ்வளவு நம்பலாம்")}</h2>
      <ul>
        <li>{t(`This is a pilot: ${corpus.records.length} records, not the whole of either epic.`, `இது முன்னோட்டம்: ${corpus.records.length} பதிவுகள் மட்டுமே.`)}</li>
        <li>{t("The records, the English and Tamil glosses, the name list and the song themes are drafts. No scholar has checked them yet. Every record does cite real lines, and a script confirms the quoted words are there.", "பதிவுகள், விளக்கங்கள், பெயர்ப்பட்டியல், பாடல் பொருள்கள் ஆகியவை வரைவுகள். அறிஞர் சரிபார்ப்பு இன்னும் நடைபெறவில்லை. ஒவ்வொரு பதிவும் உண்மையான வரிகளைச் சுட்டுகிறது; மேற்கோள் சொற்கள் அங்கு உள்ளனவா என்று நிரல் சரிபார்க்கிறது.")}</li>
        <li>{t("The question box runs in your browser with fixed rules and no language model. It can't invent an answer, but it can misread a question, and it can only answer from what's recorded.", "கேள்விப் பெட்டி உங்கள் உலாவியில் நிலையான விதிகளுடன் இயங்குகிறது. அது விடையை உருவாக்க முடியாது; ஆனால் கேள்வியைத் தவறாகப் புரிந்துகொள்ளலாம்.")}</li>
        <li>{t("The unexpected paths are ranked by a rough formula that no reader has rated. 'Not stated' means not found in the passages read so far, which is weaker than 'the poem never says'. The kōḷi fruit as jackfruit is a commentary reading I haven't checked against a printed commentary.", "தொடர்புகளின் வரிசை தோராயமானது. 'கூறப்படவில்லை' என்பது படித்த பகுதிகளில் இல்லை என்பதே. கோளிப் பாகல் = பலா என்பது அச்சு உரையுடன் ஒப்பிடப்படவில்லை.")}</li>
        <li>{t("The song themes and places are a draft reading, and shared lines don't prove borrowing.", "பாடல் பொருள்கள், இடங்கள் வரைவு வாசிப்பு; பொதுவரிகள் கடன் பெற்றதை நிரூபிக்காது.")}</li>
      </ul>
      <h2>{t("Corrections and comments", "திருத்தங்களும் கருத்துகளும்")}</h2>
      <p>{t("This is a draft for review, and readings that look wrong are the most useful thing you can send. Every record has a 'Suggest a correction' link that starts an email with its lines filled in. Or write to", "இது மதிப்பாய்வுக்கான வரைவு. தவறாகத் தோன்றும் வாசிப்புகளைத் தெரிவிப்பது மிகவும் உதவும். ஒவ்வொரு பதிவிலும் 'திருத்தம் பரிந்துரை' இணைப்பு உள்ளது. அல்லது எழுதுங்கள்:")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      <h2>{t("The Tamil text", "தமிழ் உரை")}</h2>
      <p>{t("The text of both epics is from Project Madurai, an open, voluntary, worldwide initiative preparing electronic texts of Tamil literary works and distributing them free on the Internet.", "இரு காப்பியங்களின் உரையும் மதுரைத் திட்டத்திலிருந்து (Project Madurai) பெறப்பட்டது.")} <a href="https://www.projectmadurai.org/">projectmadurai.org</a></p>
      <p className="fine">Silappatikāram: etext input Dr Badrinarayanan Seshadri; proof-reading Dr V. Venkataramanan and Mr Anbu Jaya; HTML encoding Dr V. Venkataramanan; Book 2: etext input Mr P. R. Sivakumar, proof-reading Mr P. K. Ilango. Book 3: text input Mr P. I. Arasu, proof-reading Mr P. K. Ilango. Maṇimēkalai: etext provided by the Institute of Indology and Tamil Studies, University of Köln (Dr Thomas Malten and Mr Sascha Ebeling); text convertor Mr Mani Manivannan; proof-reading Mr Ma. Sivakumar; preparation Dr K. Kalyanasundaram. © Project Madurai. The original files, with their full header pages intact, are kept in this project's <code>data/raw</code> folder.</p>
      <h2>{t("Built with", "பயன்படுத்தியவை")}</h2>
      <p className="fine">React, Vite, Sigma.js and graphology (with its Louvain and ForceAtlas2 packages), React Flow, dagre, MiniSearch, Radix UI, cmdk, Fontsource (Playfair Display, Poppins, Noto Sans Tamil, Noto Serif Tamil). All open source.</p>
    </div>
  );
}
