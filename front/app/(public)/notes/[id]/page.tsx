"use client"

import { BlockNoteView } from "@blocknote/ariakit";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/ariakit/style.css";
import { FiArrowLeft, FiEdit, FiHome } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useRef } from "react";

const title = "이것은 제목입니다."
const content = [
  {
      "id": "86b6adc7-6fa0-4fa8-a02c-5ec9580d7aa3",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "it is paragraph",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "73ab2aa0-ca62-4dfb-a5ed-8e0d8ef4185c",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [],
      "children": []
  },
  {
      "id": "49e867ad-044c-47df-b954-f574913e7a1d",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "itailc ffff. aifwejijawef",
              "styles": {
                  "code": true
              }
          }
      ],
      "children": []
  },
  {
      "id": "097ec9c6-a849-4e10-8d06-0e3310b07b93",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [],
      "children": []
  },
  {
      "id": "d17e6a3b-3bb7-442b-9914-ab047899d127",
      "type": "codeBlock",
      "props": {
          "language": "text"
      },
      "content": [
          {
              "type": "text",
              "text": "python",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "ed1ae3f1-2e57-44c8-b929-db3ad5f02135",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [],
      "children": []
  },
  {
      "id": "5daed8d7-c025-463f-b271-46ebcb18ac1e",
      "type": "codeBlock",
      "props": {
          "language": "text"
      },
      "content": [
          {
              "type": "text",
              "text": "fjeijfiejf",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "a8969cb2-2599-41df-b4fb-8753691160ba",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [],
      "children": []
  },
  {
      "id": "dcff4ae2-b26a-4769-afda-ce65753eff08",
      "type": "table",
      "props": {
          "textColor": "default"
      },
      "content": {
          "type": "tableContent",
          "columnWidths": [
              null,
              null,
              null
          ],
          "rows": [
              {
                  "cells": [
                      {
                          "type": "tableCell",
                          "content": [
                              {
                                  "type": "text",
                                  "text": "good",
                                  "styles": {}
                              }
                          ],
                          "props": {
                              "colspan": 1,
                              "rowspan": 1,
                              "backgroundColor": "default",
                              "textColor": "default",
                              "textAlignment": "left"
                          }
                      },
                      {
                          "type": "tableCell",
                          "content": [],
                          "props": {
                              "colspan": 1,
                              "rowspan": 1,
                              "backgroundColor": "default",
                              "textColor": "default",
                              "textAlignment": "left"
                          }
                      },
                      {
                          "type": "tableCell",
                          "content": [],
                          "props": {
                              "colspan": 1,
                              "rowspan": 1,
                              "backgroundColor": "default",
                              "textColor": "default",
                              "textAlignment": "left"
                          }
                      }
                  ]
              },
              {
                  "cells": [
                      {
                          "type": "tableCell",
                          "content": [
                              {
                                  "type": "text",
                                  "text": "good1",
                                  "styles": {}
                              }
                          ],
                          "props": {
                              "colspan": 1,
                              "rowspan": 1,
                              "backgroundColor": "default",
                              "textColor": "default",
                              "textAlignment": "left"
                          }
                      },
                      {
                          "type": "tableCell",
                          "content": [],
                          "props": {
                              "colspan": 1,
                              "rowspan": 1,
                              "backgroundColor": "default",
                              "textColor": "default",
                              "textAlignment": "left"
                          }
                      },
                      {
                          "type": "tableCell",
                          "content": [],
                          "props": {
                              "colspan": 1,
                              "rowspan": 1,
                              "backgroundColor": "default",
                              "textColor": "default",
                              "textAlignment": "left"
                          }
                      }
                  ]
              }
          ]
      },
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "3335d742-5351-4760-8f3f-6237da1c195e",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [
          {
              "type": "text",
              "text": "gog",
              "styles": {}
          }
      ],
      "children": []
  },
  {
      "id": "477a7e3e-06d7-4758-b11b-3b69583a80a5",
      "type": "paragraph",
      "props": {
          "backgroundColor": "default",
          "textColor": "default",
          "textAlignment": "left"
      },
      "content": [],
      "children": []
  }
]


export default function () {
  const editor = useCreateBlockNote({
    initialContent: content
  })

  const router = useRouter();
  const titleRef = useRef(null);

  const gotoNotes = () => {
    router.replace("/notes/");
  }

  return (
    <>
      <div className="flex flex-col w-[100%]">
        <div className="flex flex-row p-3">
          <button 
            onClick={gotoNotes}
            className="cursor-pointer p-3 hover:bg-[#cdcdcd] rounded"><FiArrowLeft /></button>
          <button
            onClick={gotoNotes}
            className="cursor-pointer p-3 ml-auto hover:bg-[#cdcdcd] rounded"><FiEdit /></button>
        </div>

        <div className="flex flex-row p-5 font-bold pl-[3rem] bg-white">
          <h2 className="flex-1 ">{title}</h2>
        </div>

        <div className="bg-white flex-15 pt-3">
          <BlockNoteView
            editor={editor}
            theme="light"
            editable={false}
            autoFocus={false}
          />
        </div>
      </div>
    </>
  );
}
