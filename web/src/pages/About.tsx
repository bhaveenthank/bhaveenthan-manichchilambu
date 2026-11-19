import { LinkKey } from "../components/LinkKey";
import { useApp, useT } from "../lib/app";
import { CONTACT_EMAIL } from "../lib/site";

export function AboutPage() {
  const { corpus } = useApp();
  const t = useT();
  return (
    <div className="prose">
      <header className="section-head">
        <h1>{t("About this project", "இத்திட்டம் பற்றி")}</h1>
      </header>
      <h2>{t("The name", "பெயர்")}</h2>
      <p>
        {t(
          "மணிச்சிலம்பு, Maṇichchilambu, is the gem anklet. Kannagi's case is settled by what's inside her anklet: gems, not the queen's pearls (மணியுடை அரியே, SIL-20-0078). மணி also opens the name of the second epic, Maṇimēkalai. One word for both poems, and for a story where what looked the same on the outside was settled by what was inside.",
          "மணிச்சிலம்பு என்பது மணி உள்ள சிலம்பு. கண்ணகியின் வழக்கு அவள் சிலம்பின் உள்ளே இருந்த மணியால் தீர்ந்தது; அரசியின் சிலம்பில் முத்து (மணியுடை அரியே, SIL-20-0078). மணி என்பதே இரண்டாம் காப்பியமான மணிமேகலையின் பெயரையும் தொடங்குகிறது. இரு நூல்களுக்கும் ஒரே சொல்; வெளியே ஒன்றுபோல் தோன்றியதை உள்ளே இருந்தது தீர்த்த கதை.",
        )}
      </p>
      <h2>{t("How to read the graph", "வரைபடத்தைப் படிப்பது எப்படி")}</h2>
      <p>
        {t(
          "Nothing here is stored as simply true. Every record says that someone in the text tells us something, in some mood, at some point in the story. Only what's told as fact can change who holds what or who is alive. A claim can sit in the graph forever and never become a fact.",
          "இங்கு எதுவும் நேரடி உண்மையாகச் சேமிக்கப்படுவதில்லை. நூலில் யாரோ ஒருவர் ஏதோ ஒன்றைக் கூறுகிறார் என்பதையே ஒவ்வொரு பதிவும் கூறுகிறது. நிகழ்ந்ததாகக் கூறப்பட்டவை மட்டுமே கதையின் நிலையை மாற்றும்.",
        )}
      </p>
      <h2>{t("How paths are kept honest", "தொடர்புகள் எப்படி நேர்மையாக இருக்கின்றன")}</h2>
      <p>
        {t(
          "Every step of a path carries one of seven labels for what kind of link it is, listed below. A path can't conclude more than its weakest step, so two mentions of mango stay two mentions of mango. Only an explicit record can say someone made something. Examining an anklet won't.",
          "பாதையின் ஒவ்வொரு படியும், அது எவ்வகை இணைப்பு என்பதைக் கூறும் ஏழு குறிகளில் ஒன்றைக் கொண்டுள்ளது; அவை கீழே பட்டியலிடப்பட்டுள்ளன. பாதை தன் பலவீனமான படியை விட அதிகமாக முடிவு கூற முடியாது; எனவே மாம்பழம் இருமுறை குறிப்பிடப்பட்டால் அது இரு குறிப்புகளாகவே இருக்கும். ஒருவர் ஒன்றைச் செய்தார் என்று வெளிப்படையான பதிவு மட்டுமே கூற முடியும்; ஒரு சிலம்பை ஆராய்ந்தது அதைச் செய்ததாகாது.",
        )}
      </p>
      <LinkKey />
      <h2>{t("Three measures of depth", "ஆழத்தின் மூன்று அளவுகள்")}</h2>
      <p>
        {t(
          "A 'longest path' through everything would just wander through hubs, and it's NP-hard in general anyway. So depth is reported three ways: reasoning steps needed for an answer, the longest chain in the event order, and how far a valid path runs across both epics. These numbers describe the records so far, and they'll change as more are added.",
          "எல்லாவற்றின் வழியாகவும் செல்லும் 'மிக நீண்ட பாதை' மையப் புள்ளிகளில் சுற்றித் திரியும்; பொதுவாக அதைக் கணிப்பதும் NP-கடினமானது. எனவே ஆழம் மூன்று வகையில் கூறப்படுகிறது: ஒரு விடைக்குத் தேவையான காரணப் படிகள், நிகழ்ச்சி வரிசையின் மிக நீண்ட தொடர், இரு காப்பியங்களையும் கடந்து செல்லும் சரியான பாதையின் நீளம். இந்த எண்கள் இதுவரையுள்ள பதிவுகளைப் பற்றியவை; பதிவுகள் கூடக்கூட மாறும்.",
        )}
      </p>
      <h2>{t("How far to trust it", "எவ்வளவு நம்பலாம்")}</h2>
      <ul>
        <li>
          {t(
            `This is a pilot: ${corpus.records.length} records, not the whole of either epic.`,
            `இது முன்னோட்டம்: ${corpus.records.length} பதிவுகள் மட்டுமே.`,
          )}
        </li>
        <li>
          {t(
            "The records, the English and Tamil glosses, the name list and the song themes are drafts. No scholar has checked them yet. Every record does cite real lines, and a script confirms the quoted words are there.",
            "பதிவுகள், விளக்கங்கள், பெயர்ப்பட்டியல், பாடல் பொருள்கள் ஆகியவை வரைவுகள். அறிஞர் சரிபார்ப்பு இன்னும் நடைபெறவில்லை. ஒவ்வொரு பதிவும் உண்மையான வரிகளைச் சுட்டுகிறது; மேற்கோள் சொற்கள் அங்கு உள்ளனவா என்று நிரல் சரிபார்க்கிறது.",
          )}
        </li>
        <li>
          {t(
            "The question box runs in your browser with fixed rules and no language model. It can't invent an answer, but it can misread a question, and it can only answer from what's recorded.",
            "கேள்விப் பெட்டி உங்கள் உலாவியில் நிலையான விதிகளுடன் இயங்குகிறது; மொழி மாதிரி எதுவும் இல்லை. அது விடையை உருவாக்க முடியாது; ஆனால் கேள்வியைத் தவறாகப் புரிந்துகொள்ளலாம், பதிவில் உள்ளதிலிருந்து மட்டுமே விடை தர முடியும்.",
          )}
        </li>
        <li>
          {t(
            "The unexpected paths are ranked by a rough formula that no reader has rated. 'Not stated' means not found in the passages read so far, which is weaker than 'the poem never says'. The kōḷi fruit as jackfruit is a commentary reading I haven't checked against a printed commentary.",
            "எதிர்பாராத தொடர்புகள் ஒரு தோராயமான சூத்திரத்தால் வரிசைப்படுத்தப்படுகின்றன; எந்த வாசகரும் அவற்றை மதிப்பிடவில்லை. 'கூறப்படவில்லை' என்பது இதுவரை படித்த பகுதிகளில் காணப்படவில்லை என்பதே; 'நூல் ஒருபோதும் கூறவில்லை' என்பதை விட இது பலவீனமானது. கோளிப் பாகல் = பலா என்பது உரையாசிரியர் வாசிப்பு; அச்சு உரையுடன் இன்னும் ஒப்பிடவில்லை.",
          )}
        </li>
        <li>
          {t(
            "The song themes and places are a draft reading, and shared lines don't prove borrowing.",
            "பாடல்களின் பொருள்களும் இடங்களும் வரைவு வாசிப்பே; இரு நூல்களிலும் பொதுவாக வரும் வரிகள் ஒன்று மற்றொன்றிடமிருந்து கடன் பெற்றது என்பதை நிரூபிக்காது.",
          )}
        </li>
      </ul>
      <h2>{t("Corrections and comments", "திருத்தங்களும் கருத்துகளும்")}</h2>
      <p>
        {t(
          "This is a draft for review, and readings that look wrong are the most useful thing you can send. Every record has a 'Suggest a correction' link that starts an email with its lines filled in. Or write to",
          "இது மதிப்பாய்வுக்கான வரைவு. தவறாகத் தோன்றும் வாசிப்புகளைத் தெரிவிப்பது மிகவும் உதவும். ஒவ்வொரு பதிவிலும் 'திருத்தம் பரிந்துரை' இணைப்பு உள்ளது. அல்லது எழுதுங்கள்:",
        )}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>{t("The Tamil text", "தமிழ் உரை")}</h2>
      <p>
        {t(
          "The text of both epics is from Project Madurai, an open, voluntary, worldwide initiative preparing electronic texts of Tamil literary works and distributing them free on the Internet.",
          "இரு காப்பியங்களின் உரையும் மதுரைத் திட்டத்திலிருந்து (Project Madurai) பெறப்பட்டது. தமிழ் இலக்கிய நூல்களை மின்னுரையாக்கி இணையத்தில் இலவசமாக வழங்கும், உலகெங்கும் உள்ள தன்னார்வலர்களின் திறந்த முயற்சி அது.",
        )}{" "}
        <a href="https://www.projectmadurai.org/">projectmadurai.org</a>
      </p>
      <p className="fine">
        Silappatikāram: etext input Dr Badrinarayanan Seshadri; proof-reading Dr V. Venkataramanan and Mr Anbu Jaya; HTML encoding Dr V.
        Venkataramanan; Book 2: etext input Mr P. R. Sivakumar, proof-reading Mr P. K. Ilango. Book 3: text input Mr P. I. Arasu,
        proof-reading Mr P. K. Ilango. Maṇimēkalai: etext provided by the Institute of Indology and Tamil Studies, University of Köln (Dr
        Thomas Malten and Mr Sascha Ebeling); text convertor Mr Mani Manivannan; proof-reading Mr Ma. Sivakumar; preparation Dr K.
        Kalyanasundaram. © Project Madurai. The original files, with their full header pages intact, are kept in this project's{" "}
        <code>data/raw</code> folder.
      </p>
      <h2>{t("Built with", "பயன்படுத்தியவை")}</h2>
      <p className="fine">
        {t(
          "React, Vite, Sigma.js and graphology (with its ForceAtlas2 and noverlap layouts), React Flow, dagre, MiniSearch, Radix UI, cmdk and Lucide icons. Fonts: Source Serif 4, Source Sans 3, Noto Serif Tamil and Noto Sans Tamil, served from this site through Fontsource. All open source.",
          "React, Vite, Sigma.js, graphology (ForceAtlas2, noverlap அமைப்புகளுடன்), React Flow, dagre, MiniSearch, Radix UI, cmdk, Lucide குறியீடுகள். எழுத்துருக்கள்: Source Serif 4, Source Sans 3, Noto Serif Tamil, Noto Sans Tamil; Fontsource வழியாக இத்தளத்திலிருந்தே வழங்கப்படுகின்றன. அனைத்தும் திறந்த மூலம்.",
        )}
      </p>
    </div>
  );
}
