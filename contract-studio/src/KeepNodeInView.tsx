import { useEffect, useRef } from 'react';
import { useReactFlow, useStore, type Viewport } from '@xyflow/react';

function keepAxisVisible(offset:number, scale:number, start:number, length:number, space:number) {
  const margin=20;
  const first=margin-start*scale;
  const last=space-margin-(start+length)*scale;
  return last<first ? space/2-(start+length/2)*scale : Math.max(first,Math.min(last,offset));
}

/** Pan only as far as needed while inspecting a node; keep the original view to return to. */
export function KeepNodeInView({open,nodeId,neighborIds}:{open:boolean;nodeId:string;neighborIds:string[]}) {
  const flow=useReactFlow();
  const width=useStore(state=>state.width);
  const height=useStore(state=>state.height);
  const previous=useRef<Viewport|null>(null);

  useEffect(()=>{
    if(open){
      // A quick reopen interrupts the return pan without replacing its original destination.
      if(previous.current)void flow.setViewport(flow.getViewport());
      else previous.current=flow.getViewport();
      return;
    }
    if(!previous.current)return;
    const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;
    void flow.setViewport(previous.current,{duration});
    // The viewport transition can be interrupted by panning; expire its snapshot either way.
    const timeout=window.setTimeout(()=>{previous.current=null},duration);
    return ()=>window.clearTimeout(timeout);
  },[flow,open]);

  useEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>{
      const selected=flow.getNode(nodeId);
      if(!selected||selected.hidden||!width||!height)return;
      const view=flow.getViewport();
      const node=flow.getNodesBounds([nodeId]);
      // For an expanded group the title is the anchor; its container can be larger than the canvas.
      if(node.height>height/view.zoom)node.height=Math.min(50,node.height);
      const neighbors=neighborIds.filter(id=>{const item=flow.getNode(id);return item&&!item.hidden});
      const connected=neighbors.length?flow.getNodesBounds([nodeId,...neighbors]):node;
      const bounds=connected.width*view.zoom<=width-40&&connected.height*view.zoom<=height-40?connected:node;
      const x=keepAxisVisible(view.x,view.zoom,bounds.x,bounds.width,width);
      const y=keepAxisVisible(view.y,view.zoom,bounds.y,bounds.height,height);
      if(x!==view.x||y!==view.y)void flow.setViewport({x,y,zoom:view.zoom});
    });
    return ()=>cancelAnimationFrame(frame);
  },[flow,height,neighborIds,nodeId,open,width]);

  return null;
}
