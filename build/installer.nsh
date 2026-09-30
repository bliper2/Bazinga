!macro preInit
 SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\bazinga"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\bazinga"
 SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\bazinga"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\bazinga"
!macroend
