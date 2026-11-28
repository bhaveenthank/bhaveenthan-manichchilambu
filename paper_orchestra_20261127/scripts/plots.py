import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np, os
OUT=os.path.join(os.path.dirname(__file__),"..","latex_writeup","figures"); os.makedirs(OUT,exist_ok=True)
plt.rcParams.update({"font.family":"serif","font.serif":["Times New Roman","Times","DejaVu Serif"],"font.size":9,"axes.spines.top":False,"axes.spines.right":False,"pdf.fonttype":42})
C_OK="#1f5f8b"; C_LEAK="#c0392b"; C_GREY="#9aa5ad"; C_ACC="#e08e0b"

# Fig 2: accuracy vs size (held-out)
m=[("Flat, all",180,.417,.75),("Flat, asserted",144,.556,.125),("n-ary events",480,.417,.75),
   ("n-ary + qualifiers",1132,.750,0),("Named graphs",643,.833,0),("CRM+CRMinf+PROV\n+OWL-Time (SPARQL)",2843,1.0,0),("Ledger (ours)",1287,1.0,0)]
fig,ax=plt.subplots(figsize=(3.4,2.6))
for n,s,a,l in m:
    leak=l>0
    ax.scatter(s,a,s=40+260*l,c=C_LEAK if leak else C_OK,marker="o" if leak else "s",alpha=.85,edgecolor="k",lw=.5,zorder=3)
off={"Flat, all":(10,-10),"Flat, asserted":(8,4),"n-ary events":(-10,14),"n-ary + qualifiers":(-30,-16),"Named graphs":(-58,-3),
     "CRM+CRMinf+PROV\n+OWL-Time (SPARQL)":(-38,-30),"Ledger (ours)":(-68,-4)}
for n,s,a,l in m:
    ax.annotate(n+(f"\nleak {l:.0%}" if l>0 else ""),(s,a),xytext=off[n],textcoords="offset points",fontsize=7,fontweight="bold" if "ours" in n else None)
ax.annotate("",xy=(1330,1.035),xytext=(2750,1.035),arrowprops=dict(arrowstyle="<->",color="k",lw=.7))
ax.text(1900,1.05,"45% of the statements",ha="center",fontsize=7)
ax.set_xscale("log"); ax.set_xlim(100,5000); ax.set_ylim(.2,1.1)
ax.set_xlabel("Statements in the encoding (held-out, log scale)"); ax.set_ylabel("Held-out accuracy (36 q.)")
ax.scatter([],[],c=C_LEAK,marker="o",label="states claims as facts (size = rate)",edgecolor="k",lw=.5)
ax.scatter([],[],c=C_OK,marker="s",label="no claim leakage",edgecolor="k",lw=.5)
ax.legend(loc="lower right",fontsize=6.3,frameon=False,borderaxespad=0.1)
fig.tight_layout(); fig.savefig(f"{OUT}/fig_accuracy_vs_size_leak.pdf"); fig.savefig(f"{OUT}/fig_accuracy_vs_size_leak.png",dpi=200)

# Fig 3: ablation + cross-epic
abl=[("nothing",121,0),("birth label",121,0),("open values",119,0),("contradictions",118,0),("reasons",113,0),("belief records",113,0),
     ("voice chain",110,0),("story time",104,0),("state changes",100,0),("mood",94,26)]
fig,(a1,a2)=plt.subplots(1,2,figsize=(6.8,2.4),gridspec_kw={"width_ratios":[1.35,1]})
y=np.arange(len(abl))
a1.barh(y,[r for _,r,_ in abl],color=[C_LEAK if f else C_OK for _,_,f in abl],height=.62)
a1.barh(y,[-f for _,_,f in abl],color=C_LEAK,height=.62,alpha=.5)
for i,(n,r,f) in enumerate(abl):
    a1.text(r+1,i,str(r),va="center",fontsize=7)
    if f: a1.text(-f-1,i,f"{f} false facts",va="center",ha="right",fontsize=7,color=C_LEAK)
a1.set_yticks(y,[("− "+n if n!="nothing" else "full ledger") for n,_,_ in abl],fontsize=7.5)
a1.axvline(0,color="k",lw=.6); a1.set_xlim(-75,135); a1.set_xticks([0,40,80,120])
a1.set_xlabel("Questions right (of 121)  |  false facts (left)"); a1.set_title("(a) Remove one feature",fontsize=8.5)
groups=["SIL→MAN\n(44 q.)","MAN→SIL\n(77 q.)"]; pv=[(24,8,44),(45,16,77)]; cp=[(44,0,44),(77,0,77)]
x=np.arange(2); w=.36
a2.bar(x-w/2,[r/n for r,_,n in pv],w,color=C_GREY,label="per-verb templates")
a2.bar(x+w/2,[r/n for r,_,n in cp],w,color=C_OK,label="composer (ours)")
for i,(r,f,n) in enumerate(pv): a2.text(i-w/2,r/n+.02,f"{r}/{n}\n{f} false",ha="center",fontsize=6.8,color=C_LEAK)
for i,(r,f,n) in enumerate(cp): a2.text(i+w/2,r/n+.02,f"{r}/{n}\n0 false",ha="center",fontsize=6.8)
a2.set_xticks(x,groups,fontsize=7.5); a2.set_ylim(0,1.55); a2.set_yticks([0,.5,1]); a2.set_ylabel("Share right")
a2.set_title("(b) Learn on one epic, test on the other",fontsize=8.5); a2.legend(fontsize=6.5,frameon=False,loc="upper center",ncol=2)
fig.tight_layout(); fig.savefig(f"{OUT}/fig_ablation_and_cross_epic.pdf"); fig.savefig(f"{OUT}/fig_ablation_and_cross_epic.png",dpi=200)

# Fig 4: reading vs recall
fig,(b1,b2)=plt.subplots(1,2,figsize=(6.8,2.3),gridspec_kw={"width_ratios":[1.6,1]})
modes=["few-shot","zero-shot","no verse","names masked"]; rec=[.841,.773,.591,.409]; ch=[.563,.579,.413,.200]; top=[.682,.727,.523,.295]
x=np.arange(4)
b1.bar(x,rec,.55,color=[C_OK,C_OK,C_GREY,C_GREY])
for i in range(4):
    b1.plot([i-.32,i+.32],[ch[i]]*2,color="k",lw=1); b1.plot([i-.32,i+.32],[top[i]]*2,color="k",lw=.7,ls="--")
    b1.text(i,rec[i]+.02,f"{rec[i]:.2f}",ha="center",fontsize=7)
b1.set_xticks(x,modes,fontsize=7.5); b1.set_ylim(0,1); b1.set_ylabel("Same-line recall")
b1.set_title("(a) Pilot, three famous cantos (44 gold)",fontsize=8.5)
b1.plot([],[],color="k",lw=1,label="chance (shuffled lines), mean"); b1.plot([],[],color="k",lw=.7,ls="--",label="chance, upper"); b1.legend(fontsize=6.3,frameon=False,loc="upper right")
b2.bar([0,1],[.804,.429],.55,color=[C_OK,C_GREY])
b2.axhspan(.452,.554,color=C_ACC,alpha=.25,lw=0); b2.axhline(.452,color="k",lw=1); b2.axhline(.554,color="k",lw=.7,ls="--")
b2.axhline(.60,color=C_LEAK,lw=.8,ls=":"); b2.text(1.42,.61,"pre-registered bar .60",fontsize=6.3,color=C_LEAK,ha="right")
b2.text(0,.824,".804",ha="center",fontsize=7); b2.text(1,.36,".429",ha="center",fontsize=7,color="white")
b2.text(1.45,.47,"chance band",fontsize=6.3,ha="right")
b2.set_xticks([0,1],["few-shot","no verse"],fontsize=7.5); b2.set_ylim(0,1); b2.set_xlim(-.5,1.5)
b2.set_title("(b) Stage test, 5 lesser-known cantos",fontsize=8.5)
fig.tight_layout(); fig.savefig(f"{OUT}/fig_reading_not_recall.pdf"); fig.savefig(f"{OUT}/fig_reading_not_recall.png",dpi=200)
print("ok")
