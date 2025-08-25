"use client";
import React from "react";

export default function BookingModal({ url }: { url: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button className="btn btn-primary" onClick={()=>setOpen(true)}>Book an appointment</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={()=>setOpen(false)}>
          <div className="card w-[960px] max-w-[95vw] h-[80vh]" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Book an appointment</div>
              <button className="btn" onClick={()=>setOpen(false)}>Close</button>
            </div>
            <iframe className="w-full h-[calc(100%-2rem)] rounded border" src={url} />
          </div>
        </div>
      )}
    </div>
  );
}
