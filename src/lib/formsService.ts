export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      choiceQuestion?: {
        type: "RADIO" | "CHECKBOX" | "DROP_DOWN";
        options: Array<{ value: string }>;
      };
      textQuestion?: {
        paragraph?: boolean;
      };
    };
  };
}

export interface GoogleForm {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  responderUri?: string;
  items?: GoogleFormItem[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers?: Record<
    string,
    {
      questionId: string;
      textAnswers?: {
        answers: Array<{ value: string }>;
      };
    }
  >;
}

export class GoogleFormsService {
  /**
   * Search for Google Forms using Google Drive API
   */
  static async listForms(accessToken: string): Promise<Array<{ id: string; name: string; createdTime?: string; webViewLink?: string }>> {
    const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.form' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,webViewLink,iconLink)&pageSize=30`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to list Google Forms (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Fetch details of a single Google Form
   */
  static async getForm(accessToken: string, formId: string): Promise<GoogleForm> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Google Form details (HTTP ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Fetch all submitted responses for a Google Form
   */
  static async getFormResponses(accessToken: string, formId: string): Promise<GoogleFormResponse[]> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}/responses`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch responses for Form ${formId} (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.responses || [];
  }

  /**
   * Create a new blank Google Form
   */
  static async createForm(accessToken: string, title: string, description?: string): Promise<GoogleForm> {
    const url = "https://forms.googleapis.com/v1/forms";

    const body: any = {
      info: {
        title: title || "Untitled Form",
        documentTitle: title || "Untitled Form"
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Form (HTTP ${res.status})`);
    }

    const newForm = await res.json();

    // If description is provided, update form info via batchUpdate
    if (description && newForm.formId) {
      try {
        await this.updateFormInfo(accessToken, newForm.formId, title, description);
      } catch (e) {
        console.warn("Could not set initial form description:", e);
      }
    }

    return newForm;
  }

  /**
   * Update Form Info (Title and Description)
   */
  static async updateFormInfo(accessToken: string, formId: string, title: string, description: string): Promise<void> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`;

    const body = {
      requests: [
        {
          updateFormInfo: {
            info: {
              title,
              description
            },
            updateMask: "title,description"
          }
        }
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update form info (HTTP ${res.status})`);
    }
  }

  /**
   * Add a new Question Item to Google Form
   */
  static async addQuestion(
    accessToken: string,
    formId: string,
    title: string,
    type: "TEXT" | "PARAGRAPH" | "RADIO" | "CHECKBOX" | "DROP_DOWN",
    options: string[] = ["Option 1", "Option 2"],
    required: boolean = false
  ): Promise<void> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`;

    let questionObj: any = {
      required
    };

    if (type === "TEXT") {
      questionObj.textQuestion = { paragraph: false };
    } else if (type === "PARAGRAPH") {
      questionObj.textQuestion = { paragraph: true };
    } else {
      questionObj.choiceQuestion = {
        type: type,
        options: options.map(opt => ({ value: opt || "Option" }))
      };
    }

    const body = {
      requests: [
        {
          createItem: {
            item: {
              title,
              questionItem: {
                question: questionObj
              }
            },
            location: {
              index: 0
            }
          }
        }
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to add question to form (HTTP ${res.status})`);
    }
  }

  /**
   * Delete a Google Form file from Drive
   */
  static async deleteForm(accessToken: string, fileId: string): Promise<void> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete form (HTTP ${res.status})`);
    }
  }
}
