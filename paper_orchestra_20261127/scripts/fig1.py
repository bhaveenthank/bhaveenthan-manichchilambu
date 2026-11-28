import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os
OUT=os.path.join(os.path.dirname(__file__),"..","latex_writeup","figures")
plt.rcParams.update({"font.family":"serif","font.serif":["Times New Roman","Times"],"font.size":8,"pdf.fonttype":42})
C={"asserted":"#1f5f8b","claimed":"#c0392b","conditional":"#e08e0b","metaphor":"#7f8c8d"}
fig=plt.figure(figsize=(7.0,2.75)); ax=fig.add_axes([0,0,1,1]); ax.set_xlim(0,100); ax.set_ylim(0,40); ax.axis("off")
def box(x,y,w,h,fc,ec,lw=.8,r=.6,alpha=1):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle=f"round,pad=0,rounding_size={r}",fc=fc,ec=ec,lw=lw,alpha=alpha))
ax.text(1,38.3,"Ledger records for SIL-16 and SIL-20, in story order",fontsize=8.5,fontweight="bold",va="center")
recs=[("SIL-00-0025","poet > Cattan","asserted","takes the queen's anklet   +holds(goldsmith, ank_q)"),
      ("SIL-16-0116","poet","asserted","Kovalan shows Kannagi's anklet to the goldsmith"),
      ("SIL-16-0145","poet > goldsmith","claimed","\u201cKovalan stole the queen's anklet\u201d   (changes nothing)"),
      ("SIL-16-0149","poet","asserted","belief record: the king accepts the claim"),
      ("SIL-16-0152","poet > king","conditional","\u201cif it is in the thief's hand, kill him\u201d"),
      ("SIL-16-0163","poet > guards","claimed","\u201che is not a man to be killed\u201d (contradicts)"),
      ("SIL-16-0212","poet","asserted","one drunk man kills Kovalan   \u2212alive(kovalan)"),
      ("SIL-20-0086","poet > king","metaphor","\u201cI am the thief\u201d (after rejecting the claim)"),]
y=35.2
for lid,voice,mood,txt in recs:
    box(1,y-1.45,57,2.9,"white",C[mood],lw=1.0)
    box(1,y-1.45,8.2,2.9,C[mood],C[mood],lw=1.0)
    ax.text(5.1,y,mood,color="white",ha="center",va="center",fontsize=6.4,fontweight="bold")
    ax.text(9.9,y,lid,va="center",fontsize=6.0,family="monospace")
    ax.text(18.6,y,voice,va="center",fontsize=6.4,style="italic",color="#444")
    ax.text(27.6,y,txt,va="center",fontsize=6.7)
    y-=4.1
ax.annotate("",xy=(0.4,3.2),xytext=(0.4,36.5),arrowprops=dict(arrowstyle="->",lw=.8,color="#555"))
# right: worlds
ax.text(61,38.3,"Who holds the queen's anklet at story time 16.5?",fontsize=8.5,fontweight="bold",va="center")
panels=[("The text's world","fold over asserted records only","goldsmith","#1f5f8b","correct: the accuser holds it"),
        ("The king's view","fold + claims he accepts at t","Kovalan","#6c5b9b","his belief, kept as a view"),
        ("Plain triples / n-ary event nodes","every record is a fact","goldsmith AND Kovalan","#c0392b","the lie becomes a fact")]
y=31.5
for title,how,ans,col,note in panels:
    box(61,y-4.6,38,9.2,"#fafafa",col,lw=1.2)
    ax.text(62.2,y+3.0,title,fontsize=8,fontweight="bold",color=col,va="center")
    ax.text(62.2,y+0.9,how,fontsize=6.8,style="italic",color="#444",va="center")
    ax.text(62.2,y-1.5,"holder(ank_q) = "+ans,fontsize=7.0,family="monospace",va="center")
    ax.text(62.2,y-3.5,note,fontsize=6.8,color=col,va="center")
    y-=11.2
ax.text(80,0.9,"Only an asserted record may change the state of the world.",fontsize=7.2,ha="center",style="italic")
fig.savefig(f"{OUT}/fig_anklet_said_vs_done.pdf"); fig.savefig(f"{OUT}/fig_anklet_said_vs_done.png",dpi=200)
