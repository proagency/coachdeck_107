"use client";
import React from "react";

export default function BookingModal({ url }: { url: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={()=>setOpen(true)}>Book Appointment</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setOpen(false)}>
          <div className="bg-white rounded-[3px] shadow-lg w-full max-w-3xl h-[70vh] overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="font-medium">Book an Appointment</div>
              <button className="btn" onClick={()=>setOpen(false)}>Close</button>
            </div>
            <div className="w-full h-full">
              <iframe src={url} title="Booking" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
