import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import { AppRouterI18nContext } from "@calcom/web/app/AppRouterI18nProvider";
import { CustomI18nContext } from "@calcom/web/app/CustomI18nProvider";
import type { i18n, TFunction } from "i18next";
import { createInstance } from "i18next";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

type useLocaleReturnType = {
  i18n: i18n;
  t: TFunction;
  isLocaleReady: boolean;
};

// @internal
// useTranslation() must be called unconditionally (rules of hooks), but when useLocale() below is in its
// App Router branch, this hook's result is discarded entirely - the App Router branch computes t/i18n
// itself from a server-loaded instance. Without any bound i18n instance, react-i18next's useTranslation()
// warns "You will need to pass in an i18next instance by using initReactI18next" on every page load,
// since apps/web's App Router tree isn't wrapped with initReactI18next (only the legacy Pages Router is,
// see app-providers.tsx). Passing this placeholder instance only when the result won't be used avoids the
// warning without touching real Pages Router behavior, where useTranslation() still resolves the actual
// global instance normally.
let placeholderI18nInstance: i18n | undefined;
const getPlaceholderI18nInstance = (): i18n => {
  if (!placeholderI18nInstance) {
    placeholderI18nInstance = createInstance();
    placeholderI18nInstance.init({ lng: "en", resources: {} });
  }
  return placeholderI18nInstance;
};

// @internal
const useClientLocale = (namespace: Parameters<typeof useTranslation>[0] = "common"): useLocaleReturnType => {
  const context = useAtomsContext();
  const appRouterContext = useContext(AppRouterI18nContext);
  const { i18n, t } = useTranslation(
    namespace,
    appRouterContext ? { i18n: getPlaceholderI18nInstance() } : undefined
  );
  const isLocaleReady = Object.keys(i18n).length > 0;
  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as useLocaleReturnType;
  }
  return {
    i18n,
    t,
    isLocaleReady,
  };
};

// @internal
const serverI18nInstances = new Map();

export const useLocale = (): useLocaleReturnType => {
  const appRouterContext = useContext(AppRouterI18nContext);
  const customI18nContext = useContext(CustomI18nContext);
  const clientI18n = useClientLocale();

  if (appRouterContext) {
    const { translations, locale, ns } = customI18nContext ?? appRouterContext;
    const instanceKey = `${locale}-${ns}`;

    // Check if we already have an instance for this locale and namespace
    if (!serverI18nInstances.has(instanceKey)) {
      const i18n = createInstance();
      i18n.init({
        lng: locale,
        resources: {
          [locale]: {
            [ns]: translations,
          },
        },
      });

      serverI18nInstances.set(instanceKey, {
        t: i18n.getFixedT(locale, ns),
        isLocaleReady: true,
        i18n,
      });
    }

    return serverI18nInstances.get(instanceKey);
  }

  console.warn(
    "useLocale hook is being used outside of App Router - hence this hook will use a global, client-side i18n which can cause a small flicker"
  );
  return {
    t: clientI18n.t,
    isLocaleReady: clientI18n.isLocaleReady,
    i18n: clientI18n.i18n,
  };
};
