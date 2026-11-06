"""
The strongest baseline I could build: real RDF using the standard vocabularies, answered by real SPARQL.

  CIDOC CRM : activities, custody transfers, deaths
  CRMinf    : propositions and beliefs
  PROV-O    : who it's attributed to, in order
  OWL-Time  : a position on the story timeline

If this answers everything the ledger answers, then the ledger's storage isn't the contribution, and
the paper mustn't claim it is. So it gets every fair advantage: it stores the full voice chain and all
state changes, and each question gets a hand-written query. What it can't avoid is that somebody has to
write and maintain those queries, so the query text is counted too.
"""
from rdflib import BNode, Graph, Literal, Namespace, RDF
from rdflib.namespace import PROV, TIME, XSD

from manichchilambu.ledger import FLUENT
from manichchilambu.representations import Base

CRM = Namespace("http://www.cidoc-crm.org/cidoc-crm/")
INF = Namespace("http://www.cidoc-crm.org/extensions/crminf/")
EX = Namespace("https://example.org/manichchilambu/baseline/")
PREFIX = """PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX inf: <http://www.cidoc-crm.org/extensions/crminf/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX ex: <https://example.org/manichchilambu/baseline/>
"""
AT = "?n time:hasTime/time:inTimePosition/time:numericPosition ?t ."


def build(records):
    g = Graph()
    for r in records:
        n = EX[r["id"]]
        if r["kind"] == "believe":
            g.add((n, RDF.type, INF.I2_Belief))
            g.add((n, INF.J4_that, EX[r["content"]]))
            g.add((n, INF.J5_holds_to_be, Literal(r["stance"])))
        elif r["mood"] == "asserted":
            g.add((n, RDF.type, CRM.E7_Activity))
        else:
            # Anything not told as having happened stays a proposition, never an activity.
            g.add((n, RDF.type, INF.I4_Proposition_Set))
        g.add((n, EX.kind, Literal(r["kind"])))
        g.add((n, EX.mood, Literal(r["mood"])))
        g.add((n, EX.birth, Literal(r["life"])))
        for line in r["lines"]:
            g.add((n, EX.line, Literal(line)))
        when = BNode()
        pos = BNode()
        g.add((n, TIME.hasTime, when))
        g.add((when, TIME.inTimePosition, pos))
        g.add((pos, TIME.numericPosition, Literal(r["t"], datatype=XSD.decimal)))
        for depth, who in enumerate(r["voice"]):
            q = BNode()
            g.add((n, PROV.qualifiedAttribution, q))
            g.add((q, PROV.agent, EX[who]))
            g.add((q, EX.position, Literal(depth)))
        for role, val in r["roles"].items():
            if isinstance(val, dict):
                g.add((n, EX.openRole, Literal(role)))
                val = val["one_of"]
            for v in val if isinstance(val, list) else [val]:
                g.add((n, EX[f"role_{role}"], EX[v]))
        for c in r.get("because", []):
            b = BNode()
            g.add((n, EX.reason, b))
            g.add((b, EX.of, EX[c["of"]]))
            g.add((b, EX.rel, Literal(c["rel"])))
        for key in ("contradicts", "conflicts", "retells"):
            if r.get(key):
                g.add((n, EX[key], EX[r[key]]))
        if r["mood"] == "asserted":
            for change in r.get("does", []):
                sign, name, args = FLUENT.match(change).groups()
                c = BNode()
                # E3 Condition State for the general case. Custody could be E10, it would change nothing here.
                g.add((c, RDF.type, CRM.E3_Condition_State))
                g.add((c, EX.fluent, Literal(name)))
                g.add((c, EX.sign, Literal(sign)))
                g.add((c, EX.args, Literal(args)))
                g.add((c, TIME.hasTime, when))
    return g


class Standards(Base):
    name = "standards"

    def __init__(self, records):
        super().__init__(records)
        self.g = build(records)
        self.queries_used = {}

    def size(self):
        return len(self.g)

    def _run(self, label, text):
        self.queries_used[label] = len(text.strip().splitlines())
        return list(self.g.query(PREFIX + text))

    def _match(self, kind, roles):
        lines = "".join(f'?n ex:role_{k} ex:{v} .\n' for k, v in roles.items())
        return f'?n ex:kind "{kind}" .\n{lines}'

    def happened(self, kind, roles):
        rows = self._run("happened", f"SELECT ?n WHERE {{ ?n a crm:E7_Activity .\n{self._match(kind, roles)} }}")
        return bool(rows)

    def tellers(self, kind, roles):
        rows = self._run("tellers", f"""SELECT ?n ?who ?p WHERE {{
            {self._match(kind, roles)}
            ?n prov:qualifiedAttribution ?q .
            ?q prov:agent ?who ; ex:position ?p .
        }}""")
        chains = {}
        for n, who, p in rows:
            chains.setdefault(n, []).append((int(p), str(who).rsplit("/", 1)[-1]))
        return [[w for _, w in sorted(c)] for c in chains.values()] or None

    def role_of(self, kind, roles, role):
        rows = self._run("role_of", f"SELECT ?v WHERE {{ {self._match(kind, roles)} ?n ex:role_{role} ?v . }}")
        return sorted(str(r[0]).rsplit("/", 1)[-1] for r in rows)[0] if rows else None

    def _fluent_now(self, name, t, arg_filter):
        """Fluents started by t and not ended since. This one query is the whole fold, written by hand."""
        rows = self._run("fold", f"""SELECT DISTINCT ?a WHERE {{
            ?c ex:fluent ?f ; ex:sign "+" ; ex:args ?a ; time:hasTime/time:inTimePosition/time:numericPosition ?s .
            {name}
            FILTER(?s <= {t})
            FILTER NOT EXISTS {{
                ?e ex:fluent ?f ; ex:sign "-" ; ex:args ?a ; time:hasTime/time:inTimePosition/time:numericPosition ?x .
                FILTER(?x >= ?s && ?x <= {t})
            }}
            {arg_filter}
        }}""")
        return [str(r[0]) for r in rows]

    def holder(self, obj, t):
        rows = self._fluent_now('FILTER(?f = "holds")', t, f'FILTER(STRENDS(?a, ",{obj}"))')
        return {a.split(",")[0] for a in rows} or None

    def belief(self, holder, content, t):
        rows = self._run("belief", f"""SELECT ?st ?t WHERE {{
            ?n a inf:I2_Belief ; ex:role_holder ex:{holder} ; inf:J4_that ex:{content} ; inf:J5_holds_to_be ?st .
            {AT}
            FILTER(?t <= {t})
        }} ORDER BY DESC(?t) LIMIT 1""")
        return str(rows[0][0]) if rows else None

    def alive(self, who, t):
        rows = self._run("alive", f"""ASK {{
            ?c ex:fluent "alive" ; ex:sign "-" ; ex:args "{who}" ; time:hasTime/time:inTimePosition/time:numericPosition ?s .
            FILTER(?s <= {t})
        }}""")
        return not rows[0] if rows and isinstance(rows[0], bool) else not bool(self.g.query(PREFIX + f"""ASK {{
            ?c ex:fluent "alive" ; ex:sign "-" ; ex:args "{who}" ; time:hasTime/time:inTimePosition/time:numericPosition ?s .
            FILTER(?s <= {t})
        }}""").askAnswer)

    def causes(self, kind, roles):
        rows = self._run("causes", f"""SELECT ?of ?rel ?n WHERE {{ ?n a crm:E7_Activity .
            {self._match(kind, roles)}
            OPTIONAL {{ ?n ex:reason ?b . ?b ex:of ?of ; ex:rel ?rel . }}
        }}""")
        if not rows:
            return None
        return {(str(o).rsplit("/", 1)[-1], str(r)) for o, r, _ in rows if o is not None}

    def open_values(self, kind, roles, role):
        rows = self._run("open", f"SELECT ?v WHERE {{ {self._match(kind, roles)} ?n ex:role_{role} ?v . }}")
        return {str(r[0]).rsplit("/", 1)[-1] for r in rows} or None

    def _ids(self, label, kind, roles, prop):
        found = self._run(label + "_hit", f"SELECT ?n WHERE {{ {self._match(kind, roles)} }}")
        if not found:
            return None
        rows = self._run(label, f"""SELECT DISTINCT ?m WHERE {{ {self._match(kind, roles)}
            ?m {prop} ?n . }}""")
        return {str(r[0]).rsplit("/", 1)[-1] for r in rows}

    def conflicts(self, kind, roles):
        return self._ids("conflicts", kind, roles, "ex:contradicts|ex:conflicts")

    def retellings(self, kind, roles):
        return self._ids("retellings", kind, roles, "ex:retells")

    def state_of(self, thing, t):
        rows = self._fluent_now("", t, f'FILTER(CONTAINS(CONCAT(",", ?a, ","), ",{thing},"))')
        names = {}
        for row in self.g.query(PREFIX + 'SELECT DISTINCT ?f ?a WHERE { ?c ex:fluent ?f ; ex:args ?a . }'):
            names.setdefault(str(row[1]), set()).add(str(row[0]))
        # Which fluent an args string belongs to has to be looked up again, a real wart of this modelling.
        out = []
        for a in rows:
            for f in names.get(a, []):
                if self._fluent_now(f'FILTER(?f = "{f}")', t, f'FILTER(?a = "{a}")'):
                    out.append(" ".join([f, *a.split(",")]))
        return sorted(out)

    def viewer_sees(self, viewer, t, kind, roles):
        rows = self._run("viewer", f"""SELECT ?n ?type WHERE {{
            {self._match(kind, roles)}
            ?n a ?type .
            {AT}
            FILTER(?t <= {t})
        }}""")
        for n, typ in rows:
            if typ == CRM.E7_Activity:
                return True
            cid = str(n).rsplit("/", 1)[-1]
            if self.belief(viewer, cid, t) == "accept":
                return True
        return False
