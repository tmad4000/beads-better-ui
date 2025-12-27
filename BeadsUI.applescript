-- Beads UI Launcher
-- Double-click to open Beads UI for a project

on run
	-- Prompt user to select a folder
	set projectFolder to choose folder with prompt "Select a Beads project folder:"
	set projectPath to POSIX path of projectFolder

	-- Check if it's a beads project
	set beadsDir to projectPath & ".beads"
	tell application "System Events"
		if not (exists folder beadsDir) then
			display alert "Not a Beads Project" message "No .beads directory found in " & projectPath & ". Run 'bd init <prefix>' first to initialize beads."
			return
		end if
	end tell

	-- Open Terminal and run beads-ui
	tell application "Terminal"
		activate
		do script "source ~/.zshrc && beads-ui " & quoted form of projectPath
	end tell
end run

-- Handle drag-and-drop of folders
on open theItems
	repeat with theItem in theItems
		set itemPath to POSIX path of theItem

		-- Check if it's a folder
		tell application "System Events"
			if (class of (info for theItem) is folder) then
				-- Check if it's a beads project
				set beadsDir to itemPath & ".beads"
				if exists folder beadsDir then
					tell application "Terminal"
						activate
						do script "source ~/.zshrc && beads-ui " & quoted form of itemPath
					end tell
				else
					display alert "Not a Beads Project" message "No .beads directory found. Run 'bd init <prefix>' first."
				end if
			end if
		end tell
	end repeat
end open
