"use client"

import LeftMenu from "@/components/leftMenu";
import dynamic from "next/dynamic";
import Image from "next/image";


const Editor = dynamic(() => import("@/components/editor"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex flex-row">
      <LeftMenu />
      <Editor />
    </div>
  );
}
